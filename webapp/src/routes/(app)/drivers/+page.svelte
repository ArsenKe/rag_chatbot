<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';

  type Driver = {
    id: string;
    name: string;
    licenseNumber: string;
    phone: string | null;
    hireDate: string | null;
    status: 'active' | 'inactive';
  };

  const PAGE_SIZE = 10;
  let all: Driver[] = [];
  let loading = true;
  let saving = false;
  let deleting: string | null = null;
  let errorMsg = '';
  let editingId: string | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  let search = '';
  let statusFilter = '';
  let page = 0;

  let form: { name: string; licenseNumber: string; phone: string; hireDate: string; status: 'active' | 'inactive' } = {
    name: '', licenseNumber: '', phone: '', hireDate: '', status: 'active'
  };

  $: filtered = all.filter(
    (d) =>
      (!search || d.name.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || d.status === statusFilter)
  );
  $: totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  $: { if (page >= totalPages) page = Math.max(0, totalPages - 1); }
  $: paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function loadDrivers() {
    loading = true;
    errorMsg = '';
    const res = await fetch('/api/drivers');
    const payload = await res.json();
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to load'; loading = false; return; }
    all = (payload.data ?? []).map((d: any) => ({ ...d, id: String(d.id) }));
    loading = false;
  }

  async function save() {
    saving = true;
    errorMsg = '';
    const hireDate = form.hireDate ? new Date(form.hireDate).toISOString() : '';
    const url = editingId ? `/api/drivers/${editingId}` : '/api/drivers';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, hireDate })
    });
    const payload = await res.json();
    saving = false;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to save'; return; }
    resetForm();
    await loadDrivers();
  }

  function startEdit(d: Driver) {
    editingId = d.id;
    form = {
      name: d.name,
      licenseNumber: d.licenseNumber,
      phone: d.phone ?? '',
      hireDate: d.hireDate ? d.hireDate.slice(0, 10) : '',
      status: d.status
    };
  }

  function resetForm() {
    editingId = null;
    form = { name: '', licenseNumber: '', phone: '', hireDate: '', status: 'active' };
  }

  async function remove(id: string) {
    if (!confirm('Delete this driver? This cannot be undone.')) return;
    deleting = id;
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    deleting = null;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to delete'; return; }
    if (editingId === id) resetForm();
    await loadDrivers();
  }

  function queueRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(async () => { refreshTimer = null; await loadDrivers(); }, 250);
  }

  onMount(() => {
    void loadDrivers();
    const channel = supabase
      .channel('drivers-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
        const t = String((p as { table?: string }).table ?? '').toLowerCase();
        if (t === 'driver' || t === 'driveravailability') void queueRefresh();
      })
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  });
</script>

<div class="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
  <!-- Form panel -->
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">{editingId ? 'Edit Driver' : 'Add Driver'}</h2>
      <p class="text-sm text-slate-500 mt-1">
        {editingId ? 'Update driver details then save.' : 'Create dispatch-ready driver records.'}
      </p>
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

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    <div class="flex gap-2">
      <button
        class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={save}
        disabled={saving}
      >{saving ? 'Saving…' : editingId ? 'Update driver' : 'Create driver'}</button>
      {#if editingId}
        <button class="px-4 rounded-lg border hover:bg-slate-50 text-sm" on:click={resetForm}>Cancel</button>
      {/if}
    </div>
  </section>

  <!-- Table panel -->
  <section class="space-y-3">
    <div class="flex gap-2">
      <input
        bind:value={search}
        on:input={() => (page = 0)}
        class="flex-1 rounded-lg border px-3 py-2 text-sm"
        placeholder="Search by name…"
      />
      <select bind:value={statusFilter} on:change={() => (page = 0)} class="rounded-lg border px-3 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if loading}
        <p class="p-4 text-sm text-slate-500">Loading drivers…</p>
      {:else if filtered.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">🚗</p>
          <p class="text-sm text-slate-500">
            {all.length === 0 ? 'No drivers yet. Add your first driver.' : 'No drivers match your search.'}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">Name</th>
                <th class="px-4 py-2 font-medium text-slate-600">License</th>
                <th class="px-4 py-2 font-medium text-slate-600">Phone</th>
                <th class="px-4 py-2 font-medium text-slate-600">Status</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each paginated as d (d.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === d.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 font-medium">{d.name}</td>
                  <td class="px-4 py-2 text-slate-600">{d.licenseNumber}</td>
                  <td class="px-4 py-2 text-slate-600">{d.phone ?? '—'}</td>
                  <td class="px-4 py-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                      {d.status}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs rounded border hover:bg-teal-50 hover:border-brand"
                        on:click={() => startEdit(d)}
                      >Edit</button>
                      <button
                        class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={deleting === d.id}
                        on:click={() => remove(d.id)}
                      >{deleting === d.id ? '…' : 'Delete'}</button>
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
