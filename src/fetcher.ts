import * as browserStateModule from './browser_state';
import { interpret, assign, Machine, State, AnyEventObject } from 'xstate';

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

  /** A function that should fetch the "stale" data. */
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

export interface Context {
  lastRefresh: number;
  retries: number;
  reportedError: boolean;
  storeEnabled: boolean;
  browserEnabled: boolean;
  permitted: boolean;
}

export function fetcher<
  T
>(
  {
    name,
    key,
    autoRefreshPeriod = 60 * 60 * 1000, // default 1 hour
    maxBackoff = 60 * 1000, // default 1 minute
    fetcher,
    receive,
    initialPermitted,
    initialEnabled,
    initialData,
    debug,
  }: AutoFetcherOptions<T>
) : AutoFetcher {
  name = name || key;
  const id = `autofetcher-${name}`;

  const machineDef = Machine<Context>(
    {
      id,
      initial: 'maybeStart',
      on: {
        FETCHER_ENABLED: { target: 'maybeStart', actions: 'updateStoreEnabled' },
        SET_PERMITTED: { target: 'maybeStart', actions: 'updatePermitted' },
        BROWSER_ENABLED: {
          target: 'maybeStart',
          actions: 'updateBrowserEnabled',
        },
        INITIAL_DATA: {
          actions: 'receiveInitialData',
        },
      },
      states: {
        // Not permitted to refresh, so ignore everything except the global events that might permit us to refresh.
        notPermitted: {
          entry: ['clearData', 'clearLastRefresh'],
        },
        // Store is disabled, but still permitted to refresh so we honor the FORCE_REFRESH event.
        disabled: {
          on: {
            FORCE_REFRESH: {
              target: 'refreshing',
              cond: 'permitted_to_refresh',
            },
          },
        },
        maybeStart: {
          always: [
            { cond: 'not_permitted_to_refresh', target: 'notPermitted' },
            { cond: 'can_enable', target: 'waitingForRefresh' },
            { target: 'disabled' },
          ],
        },
        waitingForRefresh: {
          on: {
            FORCE_REFRESH: 'refreshing',
          },
          after: {
            nextRefreshDelay: 'refreshing',
          },
        },
        refreshing: {
          on: {
            // Ignore the events while we're refreshing but still update the
            // context so we know where to go next.
            FETCHER_ENABLED: { target: undefined, actions: 'updateStoreEnabled' },
            SET_PERMITTED: { target: undefined, actions: 'updatePermitted' },
            BROWSER_ENABLED: {
              target: undefined,
              actions: 'updateBrowserEnabled',
            },
          },
          invoke: {
            id: 'refresh',
            src: 'refresh',
            onDone: {
              target: 'maybeStart',
              actions: 'refreshDone',
            },
            onError: {
              target: 'errorBackoff',
              actions: 'reportError',
            },
          },
        },
        errorBackoff: {
          entry: 'incrementRetry',
          after: {
            errorBackoffDelay: 'refreshing',
          },
        },
      },
    },
    {
      delays: {
        errorBackoffDelay: (context, event) => {
          const baseDelay = 200;
          const delay = baseDelay * 2 ** Math.min(context.retries, 20);
          return Math.min(delay, maxBackoff);
        },
        nextRefreshDelay: (context) => {
          let timeSinceRefresh = Date.now() - context.lastRefresh;
          let remaining = autoRefreshPeriod - timeSinceRefresh;
          return Math.max(remaining, 0);
        },
      },
      services: {
        refresh: () => fetcher(key),
      },
      actions: {
        clearLastRefresh: assign({
          lastRefresh: () => 0,
        }),
        updatePermitted: assign({
          permitted: (ctx, event) => event.data,
        }),
        updateStoreEnabled: assign({
          storeEnabled: (ctx, event) => event.data,
        }),
        updateBrowserEnabled: assign({
          browserEnabled: (ctx, event) => event.data,
        }),
        receiveInitialData: assign((context: Context, {data}) => {
          if(context.lastRefresh) {
            // We already got some new data, so don't send the stale data.
            return {};
          }

          let timestamp = data.timestamp || 0;
          receive({
            data: data.data,
            stale: true,
            timestamp,
          });

          return {
            // If the initial data included a timestamp, put it into lastRefresh.
            lastRefresh: timestamp,
          };
        }),
        incrementRetry: assign({ retries: (context) => context.retries + 1 }),
        refreshDone: assign((context: Context, event) => {
          let lastRefresh = Date.now();
          let updated = {
            lastRefresh,
            retries: 0,
            reportedError: false,
          };

          if(event.data !== UNMODIFIED && context.permitted) {
            receive({ data: event.data, timestamp: lastRefresh });
          }

          return updated;
        }),
        reportError: assign((context: Context, event) => {
          // Ignore the error if it happened because the browser went offline while fetching.
          // Otherwise report it.
          if (
            !context.reportedError &&
            browserStateModule.isOnline()
          ) {
            receive({ error: event.data, timestamp: Date.now() });
          }

          return {
            reportedError: true,
          };
        }),
        clearData: () => receive({ data: null, timestamp: Date.now() }),
      },
      guards: {
        not_permitted_to_refresh: (ctx) => !ctx.permitted,
        permitted_to_refresh: (ctx) => ctx.permitted,
        can_enable: (ctx) => {
          if (!ctx.storeEnabled || !ctx.permitted) {
            return false;
          }

          if (!ctx.lastRefresh) {
            // Refresh if we haven't loaded any data yet.
            return true;
          }

          // Finally, we can enable if the browser tab is active.
          return ctx.browserEnabled;
        },
      },
    },
    {
      lastRefresh: 0,
      retries: 0,
      reportedError: false,
      browserEnabled: true,
      storeEnabled: initialEnabled || true,
      permitted: initialPermitted || true,
    }
  );

  let machine = interpret(machineDef).start();

  if(debug) {
    machine.onTransition((state, event) => {
      debug({ id, event, state });
    });
  }

  let browserStateUnsub = browserStateModule.subscribe((state) => {
    let enabled = state.focused && state.online && state.visible;
    machine.send({ type: 'BROWSER_ENABLED', data: enabled });
  });

  async function fetchInitial() {
    let data = await initialData(key);
    let d = data?.data;
    if(d !== null && d !== undefined) {
      machine.send('INITIAL_DATA', {data});
    }
  }

  if(initialData) {
    fetchInitial();
  }

  return {
    /** Enable or disable the fetcher. This is usually linked to whether there is anything that actually cares about this
     * data or not. */
    setEnabled: (enabled : boolean) => machine.send({ type: 'FETCHER_ENABLED', data: enabled }),
    /** Set if fetching is permitted. Fetching might not be permitted if the user is not logged in or lacks
     * proper permissions for this endpoint, for example. */
    setPermitted: (permitted: boolean) => machine.send({ type: 'SET_PERMITTED', data: permitted }),
    /** Force a refresh. This will not do anything if fetching has been disabled via `setPermitted`. */
    refresh: () => machine.send('FORCE_REFRESH'),
    destroy: () => {
      browserStateUnsub();
      machine.stop();
    },
  };
}
