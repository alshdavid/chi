import * as http from "node:http";
import * as crypto from "node:crypto";
import { read_body } from "./request.js";
import { Channel, ChannelFunc, DisposeFunc, NamedChannel, first_value_from } from "./channel.js";

export type ServerSentEventsOptions = {
  format?: 'json' | 'text'
}

export class ServerSentEvents<T> {
  #on_message_to_client: NamedChannel<[T]>
  #on_message_from_client: NamedChannel<[T]>
  #on_client_connect: Channel<[ConnectEvent]>
  #on_client_disconnect: Channel<[DisconnectEvent]>
  #trigger_disconnect: NamedChannel<[]>
  #format: 'json' | 'text'

  constructor(options: ServerSentEventsOptions = {}) {
    this.#on_message_to_client = new NamedChannel<[T]>();
    this.#on_message_from_client = new NamedChannel<[T]>();
    this.#on_client_connect = new Channel<[ConnectEvent]>();
    this.#on_client_disconnect = new Channel<[DisconnectEvent]>();
    this.#trigger_disconnect = new NamedChannel<[]>();
    this.#format = options.format || 'json'
  }

  on_connect(cb: ChannelFunc<[ConnectEvent]>): DisposeFunc {
    return this.#on_client_connect.subscribe(cb);
  }

  on_disconnect(cb: ChannelFunc<[DisconnectEvent]>): DisposeFunc {
    return this.#on_client_disconnect.subscribe(cb);
  }

  on_message(id: string, cb: ChannelFunc<[T]>): DisposeFunc {
    return this.#on_message_from_client.on_event(id).subscribe(cb)
  }

  on_message_all(cb: ChannelFunc<[string, T]>): DisposeFunc {
    return this.#on_message_from_client.on_all_events(cb)
  }

  send(id: string, value: T): void {
    this.#on_message_to_client.next(id, value)
  }

  send_all(value: T): void {
    this.#on_message_to_client.next_all(value)
  }

  disconnect(id: string): void {
    this.#trigger_disconnect.next(id)
  }

  async http_handler_on_connection(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const id = crypto.randomBytes(16).toString("hex");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`event: user_connect\ndata: ${id} ${this.#format}\n\n`);
    this.#on_client_connect.next({ id })

    let unsubscribe = this.#on_message_to_client.on_event(id).subscribe((data) => {
      let msg_body: string = ''
      if (this.#format === 'json') {
        msg_body = JSON.stringify(data as string)
      }
      if (this.#format === 'text') {
        msg_body = data as string
      }
      if (!msg_body) {
        console.error('Failed to cast type')
        return
      }
      res.write(`data: ${msg_body}\n\n`);
    });

    await Promise.any([
      new Promise((resolve) => req.on("close", resolve)),
      first_value_from(this.#trigger_disconnect.on_event(id)),
    ]);

    unsubscribe();

    this.#on_client_disconnect.next({ id })
    res.write('');
    res.statusCode = 204
    res.end();
    return
  }

  async http_handler_on_message(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");

    let id = req.headers["x-sse-id"];
    if (typeof id !== 'string') {
      res.write('');
      res.statusCode = 400
      res.statusMessage = 'missing-id'
      res.end();
      return
    }

    let request_body = await read_body(req)
    if (this.#format === 'json') {
      request_body = JSON.parse(request_body)
    }
    if (this.#format === 'json' && typeof request_body !== 'object') {
      console.error('Expecting format "json" from client but received "text"')
    }

    this.#on_message_from_client.next(id, request_body as T);
    res.write('');
    res.statusCode = 204
    res.end();
  }
}

export type ConnectEvent = { id: string }
export type DisconnectEvent = { id: string }
export type DataEvent = {}
