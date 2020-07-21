<script lang="typescript">
  import { fetcher as createFetcher } from 'swr-xstate';
  import type { FetchResult } from 'swr-xstate';

  let fetcherState = { context: {}, toStrings: () => '' };

  let fetcher = createFetcher({
    name: 'test-fetcher',
    key: 'key',
    fetcher: fetchFunc,
    receive: receiveFunc,
    autoRefreshPeriod: 5000,
    debug: debugFunc,
    initialEnabled: true,
    initialPermitted: true,
  });

  let fetchSuccess = true;
  let counter = 0;
  function fetchFunc() {
    return new Promise((resolve, reject) => {
      if (fetchSuccess) {
        // Increment counter to make it a unique URL.
        let url = `https://source.unsplash.com/random/200x200?q=${counter++}`;
        setTimeout(() => resolve(url), 1000);
      } else {
        setTimeout(() => reject(new Error('Fetch failed!')), 1000);
      }
    });
  }

  let imageSrc;
  let errorText;
  let latestTimestamp = 0;
  function receiveFunc({ data, error, timestamp }: FetchResult<number>) {
    latestTimestamp = timestamp;
    errorText = '';
    if (error) {
      errorText = `Error: ${error.message}`;
    } else {
      imageSrc = data;
    }
  }

  let enabled = true;
  let permitted = true;

  $: fetcher.setEnabled(enabled);
  $: fetcher.setPermitted(permitted);

  function debugFunc(msg) {
    // console.dir(msg);
    fetcherState = msg.state;
    // msg.state.toStrings;
    // msg.state.context.lastRefresh;
  }
</script>

<div class="container p-4">
  <div class="text-lg text-gray-800">SWR Xstate</div>
  <div>
    Built by
    <a href="https://imfeld.dev">Daniel Imfeld.</a>
    See it on
    <a href="https://github.com/dimfeld/swr-xstate">Github.</a>
  </div>

  <div>
    This is a very simple example of automatic periodic fetching that gets a new
    random Unsplash image every five seconds. You can use the checkboxes to
    alter the behavior of the state machine.
  </div>

  <div class="flex flex-col sm:flex-row font-sans mt-4">
    <div class="flex flex-col sm:px-4">
      <label class="text-sm font-medium text-gray-800">
        <input type="checkbox" bind:checked={enabled} />
        Enable Fetcher
      </label>
      <label class="text-sm font-medium text-gray-800">
        <input type="checkbox" bind:checked={permitted} />
        Permit Fetching
      </label>
      <label class="text-sm font-medium text-gray-800">
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
          transition ease-in-out duration-150 font-sans"
          on:click={() => fetcher.refresh()}>
          Force Refresh
        </button>
      </span>
    </div>

    <div class="flex-1 mt-2 sm:mt-0">

      <div>Fetch Result: {errorText || imageSrc}</div>
      <div>
        <img alt="image result" width="200" height="200" src={imageSrc} />
      </div>
      <div class="text-sm font-medium text-gray-800">
        <div>
          Current State:
          <span class="font-bold">
            {fetcherState && fetcherState.toStrings()}
          </span>
        </div>
        <div>Last Refresh: {new Date(latestTimestamp).toTimeString()}</div>
        <div>Store Enabled: {fetcherState.context.storeEnabled}</div>
        <div>Browser Active: {fetcherState.context.browserEnabled}</div>
        <div>Fetching Permitted: {fetcherState.context.permitted}</div>
      </div>
    </div>
  </div>
</div>
