<script lang="ts">
  type CarStatus = 'available' | 'rented' | 'maintenance';

  type Car = {
    id: string;
    licensePlate: string;
    make: string;
    model: string;
    year: number | null;
    seats: number | null;
    transmission: string | null;
    fuelType: string | null;
    carClass: string | null;
    status: CarStatus;
  };

  const PAGE_SIZE = 10;
  let all: Car[] = [];
  let saving = false;
  let deleting: string | null = null;
  let errorMsg = '';
  let editingId: string | null = null;

  let search = '';
  let statusFilter = '';
  let page = 0;

  let form: {
    licensePlate: string; make: string; model: string; year: string; seats: string;
    transmission: string; fuelType: string; carClass: string; status: CarStatus;
  } = {
    licensePlate: '', make: '', model: '', year: '', seats: '',
    transmission: '', fuelType: '', carClass: '', status: 'available'
  };

  $: filtered = all.filter(
    (c) =>
      (!search ||
        c.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        c.make.toLowerCase().includes(search.toLowerCase()) ||
        c.model.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || c.status === statusFilter)
  );
  $: totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  $: { if (page >= totalPages) page = Math.max(0, totalPages - 1); }
  $: paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function loadCars() {
    errorMsg = '';
    const res = await fetch('/api/cars');
    const payload = await res.json();
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to load'; return; }
    all = (payload.data ?? []).map((c: any) => ({ ...c, id: String(c.id) }));
  }

  async function save() {
    saving = true;
    errorMsg = '';
    const url = editingId ? `/api/cars/${editingId}` : '/api/cars';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: form.year || undefined,
        seats: form.seats || undefined
      })
    });
    const payload = await res.json();
    saving = false;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to save'; return; }
    resetForm();
    await loadCars();
  }

  function startEdit(c: Car) {
    editingId = c.id;
    form = {
      licensePlate: c.licensePlate,
      make: c.make,
      model: c.model,
      year: c.year != null ? String(c.year) : '',
      seats: c.seats != null ? String(c.seats) : '',
      transmission: c.transmission ?? '',
      fuelType: c.fuelType ?? '',
      carClass: c.carClass ?? '',
      status: c.status
    };
  }

  function resetForm() {
    editingId = null;
    form = { licensePlate: '', make: '', model: '', year: '', seats: '', transmission: '', fuelType: '', carClass: '', status: 'available' };
  }

  async function remove(id: string) {
    if (!confirm('Delete this car? This cannot be undone.')) return;
    deleting = id;
    const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    deleting = null;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to delete'; return; }
    if (editingId === id) resetForm();
    await loadCars();
  }

  const STATUS_BADGE: Record<CarStatus, string> = {
    available: 'bg-emerald-100 text-emerald-700',
    rented: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700'
  };

  loadCars();
</script>

<div class="grid gap-6 lg:grid-cols-[380px,minmax(0,1fr)]">
  <!-- Form panel -->
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">{editingId ? 'Edit Car' : 'Add Car'}</h2>
      <p class="text-sm text-slate-500 mt-1">
        {editingId ? 'Update vehicle details then save.' : 'Register fleet vehicles with scheduling metadata.'}
      </p>
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

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    <div class="flex gap-2">
      <button
        class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={save}
        disabled={saving}
      >{saving ? 'Saving…' : editingId ? 'Update car' : 'Create car'}</button>
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
        placeholder="Search by plate, make or model…"
      />
      <select bind:value={statusFilter} on:change={() => (page = 0)} class="rounded-lg border px-3 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="available">Available</option>
        <option value="rented">Rented</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if filtered.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">🚙</p>
          <p class="text-sm text-slate-500">
            {all.length === 0 ? 'No cars yet. Register your first vehicle.' : 'No cars match your search.'}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">Plate</th>
                <th class="px-4 py-2 font-medium text-slate-600">Make / Model</th>
                <th class="px-4 py-2 font-medium text-slate-600">Year</th>
                <th class="px-4 py-2 font-medium text-slate-600">Class</th>
                <th class="px-4 py-2 font-medium text-slate-600">Status</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each paginated as c (c.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === c.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 font-medium">{c.licensePlate}</td>
                  <td class="px-4 py-2 text-slate-600">{c.make} {c.model}</td>
                  <td class="px-4 py-2 text-slate-600">{c.year ?? '—'}</td>
                  <td class="px-4 py-2 text-slate-600">{c.carClass ?? '—'}</td>
                  <td class="px-4 py-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {STATUS_BADGE[c.status]}">
                      {c.status}
                    </span>
                  </td>
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
