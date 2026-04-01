<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let loading = true;
  let saving = false;
  let errorMsg = '';

  let form = {
    name: '',
    licenseNumber: '',
    phone: '',
    hireDate: '',
    status: 'active'
  };

  async function loadDrivers() {
    loading = true;
    errorMsg = '';

    const res = await fetch('/api/drivers');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load drivers';
      rows = [];
      loading = false;
      return;
    }

    rows = payload.data ?? [];
    loading = false;
  }

  async function createDriver() {
    saving = true;
    errorMsg = '';

    const hireDate = form.hireDate ? new Date(form.hireDate).toISOString() : '';
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, hireDate })
    });
    const payload = await res.json();
    saving = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to create driver';
      return;
    }

    form = { name: '', licenseNumber: '', phone: '', hireDate: '', status: 'active' };
    await loadDrivers();
  }

  loadDrivers();
</script>

<div class="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Drivers</h2>
      <p class="text-sm text-slate-500 mt-1">Create dispatch-ready driver records.</p>
    </div>

    <div class="space-y-3">
      <input bind:value={form.name} class="w-full rounded-lg border px-3 py-2" placeholder="Driver name" />
      <input bind:value={form.licenseNumber} class="w-full rounded-lg border px-3 py-2" placeholder="License number" />
      <input bind:value={form.phone} class="w-full rounded-lg border px-3 py-2" placeholder="Phone" />
      <input bind:value={form.hireDate} class="w-full rounded-lg border px-3 py-2" type="date" />
      <select bind:value={form.status} class="w-full rounded-lg border px-3 py-2">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <button class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60" on:click={createDriver} disabled={saving}>
      {saving ? 'Saving...' : 'Create driver'}
    </button>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}
  </section>

  <section>
    {#if loading}
      <p class="text-sm text-slate-500">Loading...</p>
    {:else}
      <DataTable title="Driver Management" {rows} />
    {/if}
  </section>
</div>
