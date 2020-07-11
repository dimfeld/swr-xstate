import { State, AnyEventObject } from 'xstate';
export declare const UNMODIFIED: unique symbol;
export interface FetchResult<T> {
    data?: T;
    error?: Error;
}
export interface DebugMessage {
    id: string;
    state: State<Context, AnyEventObject, any, any>;
    event: AnyEventObject;
}
export interface FetcherOptions<T> {
    /** A string that can uniquely identify the resource to be fetched. This is
     * passed as an argument to the `fetch` and `initialData` functions.
     */
    key: string;
    /** A name for this fetcher. Will default to the vaue of `key` if not set. */
    name?: string;
    /** `fetcher` is called periodically to retrieve new data */
    fetch: (key: string) => Promise<T | Symbol>;
    /** `receiver` is called when new data has arrived. */
    receive: (result: FetchResult<T>) => T;
    /** Number of milliseconds between refresh attempts, unless refresh is forced. */
    autoRefreshPeriod?: number;
    /** Maximum number of milliseconds to wait between refresh attempts in case of error. Defaults to 1 minute. */
    maxBackoff?: number;
    /** True if the state machine should permit refreshes by default. False if it should wait for `setPerrmitted(true)`. Defaults to true. */
    initialPermitted?: boolean;
    /** True if the state machine should be enabled by default. False if it should wait for `setEnabled(true)`
     * with `true` as the data before it starts refreshing. Defaults to true.
     * Typically this is used to disable updates if nothing in the application is actually listening for changes.
     */
    initialEnabled?: boolean;
    /** Given an object, this function should print out debug information. This can be `console.log` if you want, or something like the `debug` module. Called on every state transition. */
    debug?: (msg: DebugMessage) => any;
}
interface Context {
    lastRefresh: number;
    retries: number;
    reportedError: boolean;
    storeEnabled: boolean;
    browserEnabled: boolean;
    permitted: boolean;
}
export declare function fetcher<T>({ name, key, autoRefreshPeriod, // default 1 hour
maxBackoff, // default 1 minute
fetch, receive, initialPermitted, initialEnabled, debug, }: FetcherOptions<T>): {
    /** Enable or disable the fetcher. This is usually linked to whether there is anything that actually cares about this
     * data or not. */
    setEnabled: (enabled: boolean) => State<Context, AnyEventObject, any, any>;
    /** Set if fetching is permitted. Fetching might not be permitted if the user is not logged in or lacks
     * proper permissions for this endpoint, for example. */
    setPermitted: (permitted: boolean) => State<Context, AnyEventObject, any, any>;
    /** Force a refresh. This will not do anything if fetching has been disabled via `setPermitted`. */
    refresh: () => State<Context, AnyEventObject, any, any>;
    destroy: () => void;
};
export {};
//# sourceMappingURL=fetcher.d.ts.map