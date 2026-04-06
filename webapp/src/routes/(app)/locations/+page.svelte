<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let saving = false;
  let errorMsg = '';

  let form = {
    name: '',
    address: '',
    city: '',
    postalCode: '',
    type: 'both' as 'pickup' | 'dropoff' | 'both'
  };

  async function loadLocations() {
    errorMsg = '';
    const res = await fetch('/api/locations');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load locations';
      return;
    }

    rows = (payload.data ?? []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      city: loc.city ?? '',
      address: loc.address ?? '',
      postalCode: loc.postalCode ?? '',
      type: loc.type
    }));
  }

  async function createLocation() {
    saving = true;
    errorMsg = '';

    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await res.json();
    saving = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to create location';
      return;
    }

    form = { name: '', address: '', city: '', postalCode: '', type: 'both' };
    await loadLocations();
  }

  loadLocations();
</script>

<div class="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Locations</h2>
      <p class="text-sm text-slate-500 mt-1">Add pickup and dropoff locations used in bookings.</p>
    </div>

    <div class="space-y-3">
      <input
        bind:value={form.name}
        class="w-full rounded-lg border px-3 py-2"
        placeholder="Location name (e.g. Munich Airport)"
      />
      <input
        bind:value={form.address}
        class="w-full rounded-lg border px-3 py-2"
        placeholder="Street address"
      />
      <div class="grid grid-cols-2 gap-2">
        <input
          bind:value={form.city}
          class="w-full rounded-lg border px-3 py-2"
          placeholder="City"
        />
        <input
          bind:value={form.postalCode}
          class="w-full rounded-lg border px-3 py-2"
          placeholder="Postal code"
        />
      </div>
      <select bind:value={form.type} class="w-full rounded-lg border px-3 py-2">
        <option value="both">Both (pickup &amp; dropoff)</option>
        <option value="pickup">Pickup only</option>
        <option value="dropoff">Dropoff only</option>
      </select>
    </div>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    <button
      class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
      on:click={createLocation}
      disabled={saving || !form.name.trim()}
    >
      {saving ? 'Saving...' : 'Add location'}
    </button>
  </section>

  <section>
    <DataTable title="All Locations" {rows} />
  </section>
</div>
