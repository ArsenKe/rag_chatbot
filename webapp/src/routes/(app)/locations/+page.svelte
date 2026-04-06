<script lang="ts">
  type LocType = 'pickup' | 'dropoff' | 'both';
  type Location = { id: string; name: string; city: string | null; address: string | null; postalCode: string | null; type: LocType };

  let all: Location[] = [];
  let saving = false;
  let deleting: string | null = null;
  let errorMsg = '';
  let editingId: string | null = null;

  let search = '';

  let form: { name: string; address: string; city: string; postalCode: string; type: LocType } = {
    name: '', address: '', city: '', postalCode: '', type: 'both'
  };

  $: filtered = all.filter(
    (l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function loadLocations() {
    errorMsg = '';
    const res = await fetch('/api/locations');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load locations';
      return;
    }

    all = (payload.data ?? []).map((l: any) => ({ ...l, id: String(l.id) }));
  }

  async function save() {
    saving = true;
    errorMsg = '';
    const url = editingId ? `/api/locations/${editingId}` : '/api/locations';
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
    await loadLocations();
  }

  function startEdit(l: Location) {
    editingId = l.id;
    form = { name: l.name, address: l.address ?? '', city: l.city ?? '', postalCode: l.postalCode ?? '', type: l.type };
  }

  function resetForm() {
    editingId = null;
    form = { name: '', address: '', city: '', postalCode: '', type: 'both' };
  }

  async function remove(id: string) {
    if (!confirm('Delete this location? Bookings referencing it will be affected.')) return;
    deleting = id;
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    deleting = null;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to delete'; return; }
    if (editingId === id) resetForm();
    await loadLocations();
  }

  loadLocations();
</script>

<div class="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">{editingId ? 'Edit Location' : 'Add Location'}</h2>
      <p class="text-sm text-slate-500 mt-1">
        {editingId ? 'Update location details then save.' : 'Add pickup and dropoff locations used in bookings.'}
      </p>
    </div>

    <div class="space-y-3">
      <input bind:value={form.name} class="w-full rounded-lg border px-3 py-2" placeholder="Location name (e.g. Munich Airport)" />
      <input bind:value={form.address} class="w-full rounded-lg border px-3 py-2" placeholder="Street address" />
      <div class="grid grid-cols-2 gap-2">
        <input bind:value={form.city} class="w-full rounded-lg border px-3 py-2" placeholder="City" />
        <input bind:value={form.postalCode} class="w-full rounded-lg border px-3 py-2" placeholder="Postal code" />
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

    <div class="flex gap-2">
      <button
        class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={save}
        disabled={saving || !form.name.trim()}
      >{saving ? 'Savingâ€¦' : editingId ? 'Update location' : 'Add location'}</button>
      {#if editingId}
        <button class="px-4 rounded-lg border hover:bg-slate-50 text-sm" on:click={resetForm}>Cancel</button>
      {/if}
    </div>
  </section>

  <section class="space-y-3">
    <input
      bind:value={search}
      class="w-full rounded-lg border px-3 py-2 text-sm"
      placeholder="Search by name or cityâ€¦"
    />

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if filtered.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">ðŸ“</p>
          <p class="text-sm text-slate-500">
            {all.length === 0 ? 'No locations yet. Add your first location.' : 'No locations match your search.'}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">Name</th>
                <th class="px-4 py-2 font-medium text-slate-600">City</th>
                <th class="px-4 py-2 font-medium text-slate-600">Address</th>
                <th class="px-4 py-2 font-medium text-slate-600">Type</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filtered as l (l.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === l.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 font-medium">{l.name}</td>
                  <td class="px-4 py-2 text-slate-600">{l.city ?? 'â€”'}</td>
                  <td class="px-4 py-2 text-slate-600">{l.address ?? 'â€”'}</td>
                  <td class="px-4 py-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">{l.type}</span>
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button class="px-2 py-1 text-xs rounded border hover:bg-teal-50 hover:border-brand" on:click={() => startEdit(l)}>Edit</button>
                      <button
                        class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={deleting === l.id}
                        on:click={() => remove(l.id)}
                      >{deleting === l.id ? 'â€¦' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </section>
</div>
