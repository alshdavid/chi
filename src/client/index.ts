import { JsonObject } from "../index.js";

export type ServerEventSourceOptions = {
  endpoint: string;
};

export type Callback<T> = (value: T) => any;
export type Dispose = () => any;

export class ServerEventSource<T extends JsonObject> {
  #event_source: EventSource;
  #id: Promise<string>;

  constructor(options: ServerEventSourceOptions) {
    this.#event_source = new EventSource(options.endpoint)

    this.#id = new Promise((resolve) => {
      let get_id = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.id) {
          resolve(data.id);
          this.#event_source.removeEventListener("message", get_id);
        }
      };
      this.#event_source.addEventListener("message", get_id);
    });
  }

  on(callback: Callback<T>): Dispose {
    const eventListener = (event: MessageEvent) => callback(JSON.parse(event.data));
    this.#id.then((_id) => this.#event_source.addEventListener("message", eventListener));
    return () => this.#event_source.removeEventListener("message", eventListener);
  }

  async emit(data: T): Promise<boolean> {
    return await fetch("/sse", {
      method: "POST",
      headers: { "X-SSE-ID": await this.#id },
      body: JSON.stringify(data),
    }).then((r) => r.ok);
  }
}
