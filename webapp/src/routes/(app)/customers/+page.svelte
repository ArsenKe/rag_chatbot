<script lang="ts">
  type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    driverLicense: string | null;
  };

  const PAGE_SIZE = 10;
  let all: Customer[] = [];
  let loading = true;
  let saving = false;
  let deleting: string | null = null;
  let errorMsg = '';
  let editingId: string | null = null;

  let search = '';
  let page = 0;

  let form = { name: '', email: '', phone: '', address: '', driverLicense: '' };

  $: filtered = all.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  $: totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  $: { if (page >= totalPages) page = Math.max(0, totalPages - 1); }
  $: paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function loadCustomers() {
    loading = true;
    errorMsg = '';
    const res = await fetch('/api/customers');
    const payload = await res.json();
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to load'; loading = false; return; }
    all = (payload.data ?? []).map((c: any) => ({ ...c, id: String(c.id) }));
    loading = false;
  }

  async function save() {
    saving = true;
    errorMsg = '';
    const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await res.json();
    saving = false;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to save'; return; }
    resetForm();
    await loadCustomers();
  }

  function startEdit(c: Customer) {
    editingId = c.id;
    form = {
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      driverLicense: c.driverLicense ?? ''
    };
  }

  function resetForm() {
    editingId = null;
    form = { name: '', email: '', phone: '', address: '', driverLicense: '' };
  }

  async function remove(id: string) {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    deleting = id;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    deleting = null;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to delete'; return; }
    if (editingId === id) resetForm();
    await loadCustomers();
  }

  loadCustomers();
</script>

<div class="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
  <!-- Form panel -->
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
      <p class="text-sm text-slate-500 mt-1">
        {editingId ? 'Update customer details then save.' : 'Create real booking contacts instead of entering IDs manually.'}
      </p>
    </div>

    <div class="space-y-3">
      <input bind:value={form.name} class="w-full rounded-lg border px-3 py-2" placeholder="Full name" />
      <input bind:value={form.email} class="w-full rounded-lg border px-3 py-2" placeholder="Email" type="email" />
      <input bind:value={form.phone} class="w-full rounded-lg border px-3 py-2" placeholder="Phone" />
      <input bind:value={form.address} class="w-full rounded-lg border px-3 py-2" placeholder="Address" />
      <input bind:value={form.driverLicense} class="w-full rounded-lg border px-3 py-2" placeholder="Driver license" />
    </div>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    <div class="flex gap-2">
      <button
        class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={save}
        disabled={saving}
      >{saving ? 'Saving…' : editingId ? 'Update customer' : 'Create customer'}</button>
      {#if editingId}
        <button class="px-4 rounded-lg border hover:bg-slate-50 text-sm" on:click={resetForm}>Cancel</button>
      {/if}
    </div>
  </section>

  <!-- Table panel -->
  <section class="space-y-3">
    <input
      bind:value={search}
      on:input={() => (page = 0)}
      class="w-full rounded-lg border px-3 py-2 text-sm"
      placeholder="Search by name, phone or email…"
    />

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if loading}
        <p class="p-4 text-sm text-slate-500">Loading customers…</p>
      {:else if filtered.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">👤</p>
          <p class="text-sm text-slate-500">
            {all.length === 0 ? 'No customers yet. Add your first customer.' : 'No customers match your search.'}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">Name</th>
                <th class="px-4 py-2 font-medium text-slate-600">Email</th>
                <th class="px-4 py-2 font-medium text-slate-600">Phone</th>
                <th class="px-4 py-2 font-medium text-slate-600">License</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each paginated as c (c.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === c.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 font-medium">{c.name}</td>
                  <td class="px-4 py-2 text-slate-600">{c.email ?? '—'}</td>
                  <td class="px-4 py-2 text-slate-600">{c.phone ?? '—'}</td>
                  <td class="px-4 py-2 text-slate-600">{c.driverLicense ?? '—'}</td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs rounded border hover:bg-teal-50 hover:border-brand"
                        on:click={() => startEdit(c)}
                      >Edit</button>
                      <button
                        class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={deleting === c.id}
                        on:click={() => remove(c.id)}
                      >{deleting === c.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if totalPages > 1}
          <div class="flex items-center justify-between px-4 py-3 border-t text-sm">
            <button class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-40" on:click={() => page--} disabled={page === 0}>← Prev</button>
            <span class="text-slate-500">Page {page + 1} of {totalPages} · {filtered.length} total</span>
            <button class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-40" on:click={() => page++} disabled={page >= totalPages - 1}>Next →</button>
          </div>
        {/if}
      {/if}
    </div>
  </section>
</div>