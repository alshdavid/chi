export type ChannelFunc<T extends Array<any>> = (...value: T) => any
export type DisposeFunc = () => any

export interface Subscribable<T extends Array<any>> {
  subscribe(callback: ChannelFunc<T>): DisposeFunc
}

export class Channel<T extends Array<any>> {
    #callbacks = new Set<ChannelFunc<T>>()

    subscribe(callback: ChannelFunc<T>): DisposeFunc {
        this.#callbacks.add(callback)
        return () => this.#callbacks.delete(callback)
    }

    next(...value: T): void {
        for(const cb of this.#callbacks.values()) setTimeout(() => cb(...value), 0)
    }
}

export class NamedChannel<T extends Array<any>> {
  #channels_all = new Channel<[string, ...T]>()
  #channels = new Map<string, Channel<[string, ...T]>>()

  on_all_events(cb: ChannelFunc<[string, ...T]>): DisposeFunc {
    return this.#channels_all.subscribe(cb)
  }

  on_event(name: string): Subscribable<[...T]> {
    const channel = this.#channels.get(name) || new Channel()
    this.#channels.set(name, channel)
    return {
      subscribe: (cb: ChannelFunc<[ ...T]>) => channel.subscribe((_, ...value) => cb(...value))
    }
  }

  next(name: string, ...value: T): void {
    const channel = this.#channels.get(name)
    if (channel) {
      channel.next(name, ...value)
    }
    this.#channels_all.next(name, ...value)
  }

  next_all(...value: T): void {
    for (const [name, channel] of this.#channels.entries()) {
      channel.next(name, ...value)
    }
    this.#channels_all.next('*', ...value)
  }
}

export function first_value_from<T extends Array<any>>(target: Subscribable<T>): Promise<T> {
  return new Promise<T>(resolve => {
    const dispose = target.subscribe((...values) => {
      dispose()
      resolve(values)
    })
  })
}