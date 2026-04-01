<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let loading = true;
  let saving = false;
  let errorMsg = '';

  let form = {
    name: '',
    email: '',
    phone: '',
    address: '',
    driverLicense: ''
  };

  async function loadCustomers() {
    loading = true;
    errorMsg = '';

    const res = await fetch('/api/customers');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load customers';
      rows = [];
      loading = false;
      return;
    }

    rows = (payload.data ?? []).map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email ?? '-',
      phone: customer.phone ?? '-',
      driverLicense: customer.driverLicense ?? '-'
    }));
    loading = false;
  }

  async function createCustomer() {
    saving = true;
    errorMsg = '';

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const payload = await res.json();
    saving = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to create customer';
      return;
    }

    form = { name: '', email: '', phone: '', address: '', driverLicense: '' };
    await loadCustomers();
  }

  loadCustomers();
</script>

<div class="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Customers</h2>
      <p class="text-sm text-slate-500 mt-1">Create real booking contacts instead of entering IDs manually.</p>
    </div>

    <div class="space-y-3">
      <input bind:value={form.name} class="w-full rounded-lg border px-3 py-2" placeholder="Customer name" />
      <input bind:value={form.email} class="w-full rounded-lg border px-3 py-2" placeholder="Email" type="email" />
      <input bind:value={form.phone} class="w-full rounded-lg border px-3 py-2" placeholder="Phone" />
      <input bind:value={form.address} class="w-full rounded-lg border px-3 py-2" placeholder="Address" />
      <input bind:value={form.driverLicense} class="w-full rounded-lg border px-3 py-2" placeholder="Driver license" />
    </div>

    <button class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60" on:click={createCustomer} disabled={saving}>
      {saving ? 'Saving...' : 'Create customer'}
    </button>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}
  </section>

  <section>
    {#if loading}
      <p class="text-sm text-slate-500">Loading customers...</p>
    {:else}
      <DataTable title="Customer Directory" {rows} />
    {/if}
  </section>
</div>