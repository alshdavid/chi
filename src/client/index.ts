export type SSEClientOptions = {
  endpoint: string;
  format?: 'json' | 'text'
};

export type Callback<T> = (value: T) => any;
export type Dispose = () => any;

export class SSEClient<T> {
  #event_source: EventSource;
  #id: Promise<string>;
  #format: 'json' | 'text'

  constructor(options: SSEClientOptions) {
    this.#format = options.format || 'json'
    this.#event_source = new EventSource(options.endpoint)

    this.#id = new Promise((resolve) => {
      let get_id = (event: MessageEvent) => {
        const [id, format] = event.data.split(' ')
        if (format !== this.#format) {
          console.warn(`Server sending format "${format}" but client is expecting "${this.#format}"`)
        }
        if (id) {
          resolve(id);
          this.#event_source.removeEventListener("user_connect", get_id);
        }
      };
      this.#event_source.addEventListener("user_connect", get_id);
    });
  }

  get_id(): Promise<string> {
    return this.#id
  }

  on(callback: Callback<T>): Dispose {
    const eventListener = (event: MessageEvent) => {
      let value = event.data
      if (this.#format === 'json') {
        value = JSON.parse(value)
      }
      callback(value);
    }
    this.#id.then((_id) => this.#event_source.addEventListener("message", eventListener));
    return () => this.#event_source.removeEventListener("message", eventListener);
  }

  async send(data: T): Promise<boolean> {
    return await fetch("/sse", {
      method: "POST",
      headers: { "X-SSE-ID": await this.#id },
      body: JSON.stringify(data),
    }).then((r) => r.ok);
  }
}
