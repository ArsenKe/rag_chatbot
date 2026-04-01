<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let saving = false;
  let errorMsg = '';
  let form = {
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    seats: '',
    transmission: '',
    fuelType: '',
    carClass: '',
    status: 'available'
  };

  async function loadCars() {
    errorMsg = '';
    const res = await fetch('/api/cars');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load cars';
      rows = [];
      return;
    }

    rows = payload.data ?? [];
  }

  async function createCar() {
    saving = true;
    errorMsg = '';

    const res = await fetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: form.year || undefined,
        seats: form.seats || undefined
      })
    });
    const payload = await res.json();
    saving = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to create car';
      return;
    }

    form = {
      licensePlate: '',
      make: '',
      model: '',
      year: '',
      seats: '',
      transmission: '',
      fuelType: '',
      carClass: '',
      status: 'available'
    };
    await loadCars();
  }

  loadCars();
</script>

<div class="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Cars</h2>
      <p class="text-sm text-slate-500 mt-1">Register fleet vehicles with the core metadata needed for scheduling.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <input bind:value={form.licensePlate} class="rounded-lg border px-3 py-2 sm:col-span-2" placeholder="License plate" />
      <input bind:value={form.make} class="rounded-lg border px-3 py-2" placeholder="Make" />
      <input bind:value={form.model} class="rounded-lg border px-3 py-2" placeholder="Model" />
      <input bind:value={form.year} class="rounded-lg border px-3 py-2" placeholder="Year" type="number" />
      <input bind:value={form.seats} class="rounded-lg border px-3 py-2" placeholder="Seats" type="number" />
      <input bind:value={form.transmission} class="rounded-lg border px-3 py-2" placeholder="Transmission" />
      <input bind:value={form.fuelType} class="rounded-lg border px-3 py-2" placeholder="Fuel type" />
      <input bind:value={form.carClass} class="rounded-lg border px-3 py-2" placeholder="Car class" />
      <select bind:value={form.status} class="rounded-lg border px-3 py-2">
        <option value="available">Available</option>
        <option value="rented">Rented</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>

    <button class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60" on:click={createCar} disabled={saving}>
      {saving ? 'Saving...' : 'Create car'}
    </button>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}
  </section>

  <section>
    <DataTable title="Car Fleet" {rows} />
  </section>
</div>
