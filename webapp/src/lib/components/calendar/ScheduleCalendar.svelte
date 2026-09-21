<script lang="ts">
  export let events: Array<{
    bookingId: string;
    title: string;
    start: string;
    end: string;
    status: string;
    customerName: string;
    pickup: string;
    dropoff: string;
    driver?: string;
    car?: string;
  }> = [];

  export let onAccept: ((bookingId: string) => void) | undefined = undefined;
  export let onReject: ((bookingId: string) => void) | undefined = undefined;

  function badgeClass(status: string) {
    if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  }
</script>

<section class="bg-white rounded-xl border shadow-sm p-4">
  <div class="space-y-3">
    {#if events.length === 0}
      <p class="text-sm text-slate-500">No assigned jobs yet.</p>
    {:else}
      {#each events as event}
        <div class="rounded-xl border bg-slate-50 p-3">
          <div class="mb-2 flex items-center justify-between gap-3">
            <div class="font-semibold">{event.customerName}</div>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase {badgeClass(event.status)}">
              {event.status}
            </span>
          </div>

          <div class="space-y-1 text-xs text-slate-600">
            <div><strong>When:</strong> {event.start} → {event.end}</div>
            <div><strong>Pickup:</strong> {event.pickup}</div>
            <div><strong>Dropoff:</strong> {event.dropoff}</div>
            <div><strong>Car:</strong> {event.car ?? 'Pending'}</div>
          </div>

          {#if event.status === 'reserved'}
            <div class="mt-3 flex gap-2">
              <button
                class="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                on:click={() => onAccept?.(event.bookingId)}
              >
                Accept
              </button>
              <button
                class="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                on:click={() => onReject?.(event.bookingId)}
              >
                Reject
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</section>
