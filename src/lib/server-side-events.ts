// @ts-check
import * as http from "node:http";
import * as crypto from "node:crypto";
import { read_body_json } from "./request.js";
import { Channel, ChannelFunc, DisposeFunc, NamedChannel } from "./channel.js";

export class ServerSideEvents<T extends JsonObject> {
  #on_message_to_client = new NamedChannel<T>();
  #on_message_from_client = new NamedChannel<T>();
  #on_client_connect = new Channel<ConnectEvent>();
  #on_client_disconnect = new Channel<DisconnectEvent>();

  on_connect(cb: ChannelFunc<ConnectEvent>): DisposeFunc {
    return this.#on_client_connect.subscribe(cb);
  }

  on_disconnect(cb: ChannelFunc<DisconnectEvent>): DisposeFunc {
    return this.#on_client_disconnect.subscribe(cb);
  }

  on_message(id: string, cb: ChannelFunc<T>): DisposeFunc {
    return this.#on_message_from_client.subscribe(id, cb)
  }

  send(id: string, value: T): void {
    this.#on_message_to_client.next(id, value)
  }

  send_all(value: T): void {
    this.#on_message_to_client.next_all(value)
  }

  #on_emit_to_client(id: string, cb: ChannelFunc<T>): DisposeFunc {
    return this.#on_message_to_client.subscribe(id, cb)
  }

  #notify_message_from_client(id: string, value: T): void {
    this.#on_message_from_client.next(id, value)
  }

  handlers = Object.freeze({
    get_sse: async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
      const id = crypto.randomBytes(16).toString("hex");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "connect", id })}\n\n`);
      this.#on_client_connect.next({ id })

      let unsubscribe = this.#on_emit_to_client(id, (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      });

      await new Promise((resolve) => req.on("close", resolve));
      unsubscribe();

      this.#on_client_disconnect.next({ id })
      res.statusCode = 200
      res.end();
      return
    },
    post_sse: async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
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

      this.#notify_message_from_client(id, await read_body_json(req));
      res.write('');
      res.statusCode = 204
      res.end();
    },
  });
}

export type ConnectEvent = { id: string }
export type DisconnectEvent = { id: string }
export type DataEvent = {}

export type JsonObject =
    | string
    | number
    | boolean
    | null
    | undefined
    | JsonObject[]
    | { [key: string]: JsonObject }
    | { toJSON(): JsonObject };