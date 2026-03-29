<script lang="ts">
  export let events: Array<{
    title: string;
    start: string;
    end: string;
    driver?: string;
    car?: string;
  }> = [];
</script>

<section class="bg-white rounded-xl border shadow-sm p-4">
  <h2 class="font-semibold mb-3">Schedule Calendar</h2>
  <p class="text-sm text-slate-500 mb-3">
    Placeholder calendar. Replace with FullCalendar and wire drag-and-drop to /api/assignments.
  </p>

  <div class="space-y-2">
    {#if events.length === 0}
      <p class="text-sm text-slate-500">No scheduled events.</p>
    {:else}
      {#each events as event}
        <div class="p-3 rounded-lg bg-slate-50 border">
          <div class="font-medium">{event.title}</div>
          <div class="text-xs text-slate-600">{event.start} → {event.end}</div>
          <div class="text-xs text-slate-500">Driver: {event.driver ?? '-'} | Car: {event.car ?? '-'}</div>
        </div>
      {/each}
    {/if}
  </div>
</section>
