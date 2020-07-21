<script lang="typescript">
  import { fetcher as createFetcher } from 'swr-xstate';
  import type { FetchResult } from 'swr-xstate';
  import Switch from './Switch.svelte';

  let fetcherState = { context: {}, toStrings: () => '' };

  let fetcher = createFetcher<string>({
    name: 'test-fetcher',
    key: 'key',
    fetcher: fetchFunc,
    receive: receiveFunc,
    initialData: () =>
      Promise.resolve({
        data: 'https://imfeld.dev/images/projects-httptreemux.svg',
        timestamp: 1,
      }),
    autoRefreshPeriod: 5000,
    debug: debugFunc,
    initialEnabled: true,
    initialPermitted: true,
  });

  let fetchSuccess = true;
  let counter = 0;
  let fetchDelay = 2500;
  function fetchFunc() {
    return new Promise((resolve, reject) => {
      if (fetchSuccess) {
        // Increment counter to make it a unique URL.
        let url = `https://source.unsplash.com/random/200x200?q=${counter++}`;
        setTimeout(() => resolve(url), fetchDelay);
      } else {
        setTimeout(() => reject(new Error('Fetch failed!')), fetchDelay);
      }
    });
  }

  let imageSrc;
  let receivedStale;
  let errorText;
  let latestTimestamp = 0;
  function receiveFunc({ data, error, stale, timestamp }: FetchResult<number>) {
    latestTimestamp = timestamp;
    errorText = '';
    receivedStale = Boolean(stale);
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

<style>
  a {
    @apply underline;
  }
</style>

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
      <label class="text-sm font-medium text-gray-800 mt-2 flex items-center">
        <Switch bind:value={enabled} />
        <span class="ml-1">Enable Fetcher</span>
      </label>
      <label class="text-sm font-medium text-gray-800 mt-2 flex items-center">
        <Switch bind:value={permitted} />
        <span class="ml-1">Permit Fetching</span>
      </label>
      <label class="text-sm font-medium text-gray-800 mt-2 flex items-center">
        <Switch bind:value={fetchSuccess} />
        <span class="ml-1">Fetch Succeeds</span>
      </label>
      <span class="inline-flex rounded-md shadow-sm mt-2">
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
      <label class="text-sm mt-2 items-start flex flex-col space-y-1">
        <div>
          <span class="font-medium text-gray-800">Fetch Delay</span>
          {fetchDelay}ms
        </div>
        <div>
          <input
            class="text-teal-600"
            type="range"
            min="0"
            max="10000"
            step="100"
            bind:value={fetchDelay} />
        </div>

      </label>
    </div>

    <div class="flex-1 mt-2 sm:mt-0">

      <div>
        <span class="font-medium text-gray-800">Fetch Result:</span>
        {errorText || imageSrc}
        {#if receivedStale}
          <span class="font-bold">(stale)</span>
        {/if}
      </div>
      <div class="border" style="width:200px;height:200px">
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
