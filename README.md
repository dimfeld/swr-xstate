This is an implementation of a stale-while-revalidate data fetcher implemented with the [XState](https://xstate.js.org) library. It implements many of the features found in other popular SWR libraries, such as periodic updates and disabling the fetcher when the browser is not focused.

I wrote about the design and implementation on [my website](https://imfeld.dev/writing/swr_with_xstate).

```typescript
/** The fetcher function can return this if it tried to fetch and found the data was unchanged. */
export const UNMODIFIED = Symbol('unmodified');

export interface FetchResult<T> {
  data?: T;
  error?: Error;
  /** When this data was fetched */
  timestamp: number;
  /** True if this is the stale data. Absent otherwise. */
  stale? : boolean;
}

export interface DebugMessage {
  id: string;
  state: State<Context, AnyEventObject, any, any>;
  event: AnyEventObject;
}

export interface InitialData<T> {
  data: T;
  timestamp?: number;
}

export interface AutoFetcherOptions<
  T
> {
  /** A string that can uniquely identify the resource to be fetched. This is
   * passed as an argument to the `fetch` and `initialData` functions.
   */
  key: string;

  /** A name for this fetcher. Will default to the vaue of `key` if not set. */
  name?: string;

  /** A function that should fetch the "stale" data. Called when the fetcher is created. */
  initialData?: (key:string) => Promise<InitialData<T>|null>;

  /** `fetcher` is called periodically to retrieve new data */
  fetcher: (key: string) => Promise<T|Symbol>,
  /** `receive` is called when new data has arrived. */
  receive: (result : FetchResult<T>) => any;

  /** Number of milliseconds between refresh attempts, unless refresh is forced. */
  autoRefreshPeriod?: number;

  /** Maximum number of milliseconds to wait between refresh attempts in case of error. Defaults to 1 minute. */
  maxBackoff? : number;

  /** True if the state machine should permit refreshes by default. False if it should wait for `setPerrmitted(true)`. Defaults to true. */
  initialPermitted? : boolean;

  /** True if the state machine should be enabled by default. False if it should wait for `setEnabled(true)`
   * with `true` as the data before it starts refreshing. Defaults to true.
   * Typically this is used to disable updates if nothing in the application is actually listening for changes.
   */
  initialEnabled? : boolean;

  /** Given an object, this function should print out debug information. This can be `console.log` if you want, or something like the `debug` module. Called on every state transition. */
  debug?: (msg : DebugMessage) => any;
}

export interface AutoFetcher {
  /** Set if fetching is enabled. It might be disabled if you know that nothing is using this data right now. */
  setEnabled: (enabled : boolean) => void;
  /** Set if fetching is permitted. Fetching might not be permitted if the user is not logged in or lacks
   * proper permissions for this endpoint, for example. */
  setPermitted: (permitted: boolean) => void;
  /** Force a refresh. This will not do anything if fetching has been disabled via `setPermitted`. */
  refresh: () => void;
  destroy: () => void;
}

/** This function creates a fetcher */
export function fetcher<T>(options : AutoFetcherOptions<T>) : AutoFetcher;
```

