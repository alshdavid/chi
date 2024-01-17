export type ChannelFunc<T> = (value: T) => any
export type DisposeFunc = () => any

export class Channel<T = unknown> {
    #callbacks = new Set<ChannelFunc<T>>()

    subscribe(callback: ChannelFunc<T>): DisposeFunc {
        this.#callbacks.add(callback)
        return () => this.#callbacks.delete(callback)
    }

    next(value: T): void {
        for(const cb of this.#callbacks.values()) setTimeout(() => cb(value), 0)
    }
}

export class NamedChannel<T = unknown> {
  #channels = new Map<string, Channel<T>>()

  subscribe(name: string, cb: ChannelFunc<T>): DisposeFunc {
    const channel = this.#channels.get(name) || new Channel()
    this.#channels.set(name, channel)
    return channel.subscribe(cb)
  }

  next(name: '*' | string, value: T): void {
    const channel = this.#channels.get(name)
    const wc_channel = this.#channels.get("*")
    if (!channel || !wc_channel) {
      return
    }
    channel.next(value)
    wc_channel.next(value)
  }

  next_all(value: T): void {
    for (const channel of this.#channels.values()) {
      channel.next(value)
    }
  }
}
