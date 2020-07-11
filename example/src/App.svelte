<script lang="typescript">
  import { fetcher as createFetcher } from 'swr-xstate';

  let fetcher = createFetcher({
    name: 'test-fetcher',
    key: 'key',
    fetch: fetchFunc,
    receive: receiveFunc,
    autoRefreshPeriod: 5000,
    debug: debugFunc,
    initialEnabled: true,
    initialPermitted: true,
  });

  let fetchSuccess = true;
  let nextVal = 0;
  function fetchFunc() {
    return new Promise((resolve, reject) => {
      if (fetchSuccess) {
        setTimeout(() => resolve(++nextVal), 1000);
      } else {
        setTimeout(() => reject(new Error('Fetch failed!')), 1000);
      }
    });
  }

  let latestData;
  function receiveFunc({ data, error }) {
    if (error) {
      latestData = `Error: ${error.message}`;
    } else {
      latestData = data;
    }
  }

  let enabled = true;
  let permitted = true;

  $: fetcher.setEnabled(enabled);
  $: fetcher.setPermitted(permitted);

  let fetcherState;

  function debugFunc(msg) {
    console.dir(msg);
    fetcherState = msg.state;
    msg.state.toStrings;
    msg.state.context.lastRefresh;
  }
</script>

<div class="flex flex-row mt-2">
  <div class="flex flex-col px-4">
    <label>
      <input type="checkbox" bind:checked={enabled} />
      Enable Fetcher
    </label>
    <label>
      <input type="checkbox" bind:checked={permitted} />
      Permit Fetching
    </label>
    <label>
      <input type="checkbox" bind:checked={fetchSuccess} />
      Fetch Succeeds
    </label>
    <span class="inline-flex rounded-md shadow-sm">
      <button
        type="button"
        class="inline-flex items-center px-2.5 py-1.5 border border-gray-300
        text-xs leading-4 font-medium rounded text-gray-700 bg-white
        hover:text-gray-500 focus:outline-none focus:border-blue-300
        focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50
        transition ease-in-out duration-150"
        on:click={() => fetcher.refresh()}>
        Force Refresh
      </button>
    </span>
  </div>

  <div class="flex-1">

    <p>Latest Result: {latestData}</p>
    <p>Current State: {fetcherState.toStrings()}</p>
    <p>Last Refresh: {new Date(fetcherState.context.lastRefresh)}</p>
    <p>Store Enabled: {fetcherState.context.storeEnabled}</p>
    <p>Browser Active: {fetcherState.context.browserEnabled}</p>
    <p>Fetching Permitted: {fetcherState.context.permitted}</p>
  </div>
</div>
