<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let classNames = '';
  export let id = undefined;
  export { classNames as class };
  export let value = false;
  let focused = false;
  function toggle() {
    value = !value;
    dispatch('change', value);
  }
  function handleKeydown(evt) {
    if (evt.key === 'Space') {
      evt.preventDefault();
      toggle();
    }
  }
</script>

<span
  {id}
  class:bg-gray-200={!value}
  class:bg-teal-600={value}
  class="relative inline-block flex-shrink-0 h-6 w-11 border-2
  border-transparent rounded-full cursor-pointer transition-colors ease-in-out
  duration-200 focus:outline-none focus:shadow-outline {classNames}"
  role="checkbox"
  tabindex="0"
  on:click={toggle}
  on:keydown={handleKeydown}
  aria-checked={value.toString()}>
  <span
    aria-hidden="true"
    class:translate-x-5={value}
    class:translate-x-0={!value}
    class="inline-block h-5 w-5 rounded-full bg-white shadow transform
    transition ease-in-out duration-200" />
</span>
