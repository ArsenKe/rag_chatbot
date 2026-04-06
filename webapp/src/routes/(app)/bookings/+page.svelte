<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';

  type BookingStatus = 'reserved' | 'confirmed' | 'completed' | 'cancelled';

  type BookingRow = {
    id: string;
    customer: string;
    pickup: string;
    dropoff: string;
    start: string;
    end: string;
    status: BookingStatus;
    carClass: string;
    notes: string;
    assigned: string;
  };

  const PAGE_SIZE = 10;
  let allRows: BookingRow[] = [];
  let bookingOptions: Array<{ id: string; label: string }> = [];
  let customers: Array<{ id: string; name: string }> = [];
  let locations: Array<{ id: string; label: string }> = [];
  let drivers: Array<{ id: string; name: string }> = [];
  let cars: Array<{ id: string; label: string }> = [];
  let loading = true;
  let saving = false;
  let assigning = false;
  let cancelling: string | null = null;
  let errorMsg = '';
  let assignErrorMsg = '';
  let editErrorMsg = '';
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // null = create mode, string = editing that booking id
  let editingId: string | null = null;
  let editingLabel = '';

  // Filters / pagination
  let search = '';
  let statusFilter = '';
  let page = 0;

  let form = {
    customerId: '',
    pickupLocationId: '',
    dropoffLocationId: '',
    requestedStart: '',
    requestedEnd: '',
    carClass: '',
    notes: ''
  };

  let editForm: { status: BookingStatus; carClass: string; notes: string } = {
    status: 'reserved',
    carClass: '',
    notes: ''
  };

  let assignForm = {
    bookingId: '',
    driverId: '',
    carId: '',
    override: false
  };

  $: filtered = allRows.filter((b) => {
    const matchSearch =
      !search ||
      b.customer.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup.toLowerCase().includes(search.toLowerCase()) ||
      b.dropoff.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });
  $: totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  $: { if (page >= totalPages) page = Math.max(0, totalPages - 1); }
  $: paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function loadBookings() {
    loading = true;
    errorMsg = '';

    const [bookingsRes, customersRes, locationsRes, driversRes, carsRes] = await Promise.all([
      fetch('/api/bookings'),
      fetch('/api/customers'),
      fetch('/api/locations'),
      fetch('/api/drivers?status=active'),
      fetch('/api/cars?status=available')
    ]);

    const [bookingsPayload, customersPayload, locationsPayload, driversPayload, carsPayload] = await Promise.all([
      bookingsRes.json(),
      customersRes.json(),
      locationsRes.json(),
      driversRes.json(),
      carsRes.json()
    ]);

    if (!bookingsRes.ok || !customersRes.ok || !locationsRes.ok || !driversRes.ok || !carsRes.ok) {
      errorMsg =
        bookingsPayload.error?.message ||
        customersPayload.error?.message ||
        locationsPayload.error?.message ||
        driversPayload.error?.message ||
        carsPayload.error?.message ||
        'Failed to load booking data';
      allRows = [];
      bookingOptions = [];
      customers = [];
      locations = [];
      drivers = [];
      cars = [];
      loading = false;
      return;
    }

    customers = (customersPayload.data ?? []).map((c: any) => ({ id: String(c.id), name: c.name }));
    locations = (locationsPayload.data ?? []).map((l: any) => ({
      id: String(l.id),
      label: [l.name, l.city].filter(Boolean).join(' Â· ')
    }));
    drivers = (driversPayload.data ?? []).map((d: any) => ({ id: String(d.id), name: d.name }));
    cars = (carsPayload.data ?? []).map((c: any) => ({
      id: String(c.id),
      label: [c.licensePlate, c.model].filter(Boolean).join(' Â· ')
    }));

    const bookings = bookingsPayload.data ?? [];
    bookingOptions = bookings
      .filter((b: any) => b.status !== 'cancelled' && !b.trip)
      .map((b: any) => ({
        id: String(b.id),
        label: `#${b.id} Â· ${b.customer?.name ?? 'Unknown'} Â· ${b.status}`
      }));

    allRows = bookings.map((b: any) => ({
      id: String(b.id),
      customer: b.customer?.name ?? String(b.customerId),
      pickup: b.pickupLocation?.name ?? 'â€”',
      dropoff: b.dropoffLocation?.name ?? 'â€”',
      start: b.requestedStart,
      end: b.requestedEnd,
      status: b.status,
      carClass: b.carClass ?? '',
      notes: b.notes ?? '',
      assigned: b.trip ? 'yes' : 'no'
    }));

    loading = false;
  }

  async function createBooking() {
    saving = true;
    errorMsg = '';
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        requestedStart: new Date(form.requestedStart).toISOString(),
        requestedEnd: new Date(form.requestedEnd).toISOString()
      })
    });
    const payload = await res.json();
    saving = false;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to create booking'; return; }
    form = { customerId: '', pickupLocationId: '', dropoffLocationId: '', requestedStart: '', requestedEnd: '', carClass: '', notes: '' };
    await loadBookings();
  }

  function startEdit(b: BookingRow) {
    editingId = b.id;
    editingLabel = `#${b.id} â€” ${b.customer}`;
    editForm = { status: b.status, carClass: b.carClass, notes: b.notes };
    editErrorMsg = '';
  }

  function cancelEdit() {
    editingId = null;
    editingLabel = '';
    editErrorMsg = '';
  }

  async function saveEdit() {
    if (!editingId) return;
    saving = true;
    editErrorMsg = '';
    const res = await fetch(`/api/bookings/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    const payload = await res.json();
    saving = false;
    if (!res.ok) { editErrorMsg = payload.error?.message ?? 'Failed to save'; return; }
    cancelEdit();
    await loadBookings();
  }

  async function cancelBooking(id: string) {
    if (!confirm('Cancel this booking?')) return;
    cancelling = id;
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    const payload = await res.json();
    cancelling = null;
    if (!res.ok) { errorMsg = payload.error?.message ?? 'Failed to cancel'; return; }
    if (editingId === id) cancelEdit();
    await loadBookings();
  }

  async function assignBooking() {
    assignErrorMsg = '';
    if (!assignForm.bookingId) { assignErrorMsg = 'Select a booking to assign.'; return; }
    const bookingId = assignForm.bookingId;
    const previousRows = allRows;
    allRows = allRows.map((r) => r.id === bookingId ? { ...r, status: 'confirmed' as BookingStatus } : r);
    assigning = true;
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, driverId: assignForm.driverId || undefined, carId: assignForm.carId || undefined, override: assignForm.override })
    });
    const payload = await res.json();
    assigning = false;
    if (!res.ok) { allRows = previousRows; assignErrorMsg = payload.error?.message ?? 'Failed to assign'; return; }
    allRows = allRows.map((r) => r.id === bookingId ? { ...r, status: 'confirmed' as BookingStatus, assigned: 'yes' } : r);
    assignForm = { bookingId: '', driverId: '', carId: '', override: false };
    void queueRefresh();
  }

  function queueRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(async () => { refreshTimer = null; await loadBookings(); }, 250);
  }

  const STATUS_BADGE: Record<BookingStatus, string> = {
    reserved: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-red-100 text-red-600'
  };

  onMount(() => {
    void loadBookings();
    const channel = supabase
      .channel('bookings-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
        const t = String((p as { table?: string }).table ?? '').toLowerCase();
        if (t === 'booking' || t === 'trip' || t === 'driver') void queueRefresh();
      })
      .subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  });
</script>

<div class="grid gap-6 lg:grid-cols-[420px,minmax(0,1fr)]">
  <!-- Left panel: create / edit / assign -->
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    {#if editingId}
      <!-- Edit mode -->
      <div>
        <h2 class="text-xl font-semibold">Edit Booking</h2>
        <p class="text-sm text-slate-500 mt-1">{editingLabel}</p>
      </div>

      <div class="space-y-3">
        <div>
          <label for="edit-status" class="text-xs font-medium text-slate-600 mb-1 block">Status</label>
          <select id="edit-status" bind:value={editForm.status} class="w-full rounded-lg border px-3 py-2">
            <option value="reserved">Reserved</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <input bind:value={editForm.carClass} class="w-full rounded-lg border px-3 py-2" placeholder="Car class" />
        <textarea bind:value={editForm.notes} class="w-full rounded-lg border px-3 py-2 text-sm" rows="3" placeholder="Notes"></textarea>
      </div>

      {#if editErrorMsg}
        <p class="text-sm text-red-600">{editErrorMsg}</p>
      {/if}

      <div class="flex gap-2">
        <button
          class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
          on:click={saveEdit}
          disabled={saving}
        >{saving ? 'Savingâ€¦' : 'Save changes'}</button>
        <button class="px-4 rounded-lg border hover:bg-slate-50 text-sm" on:click={cancelEdit}>Cancel</button>
      </div>
    {:else}
      <!-- Create mode -->
      <div>
        <h2 class="text-xl font-semibold">Bookings</h2>
        <p class="text-sm text-slate-500 mt-1">Create operational bookings using real customers and locations.</p>
      </div>

      <div class="space-y-3">
        <select bind:value={form.customerId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Select customer</option>
          {#each customers as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
        <select bind:value={form.pickupLocationId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Pickup location</option>
          {#each locations as l}
            <option value={l.id}>{l.label}</option>
          {/each}
        </select>
        <select bind:value={form.dropoffLocationId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Dropoff location</option>
          {#each locations as l}
            <option value={l.id}>{l.label}</option>
          {/each}
        </select>
        <input bind:value={form.requestedStart} class="w-full rounded-lg border px-3 py-2" type="datetime-local" />
        <input bind:value={form.requestedEnd} class="w-full rounded-lg border px-3 py-2" type="datetime-local" />
        <input bind:value={form.carClass} class="w-full rounded-lg border px-3 py-2" placeholder="Requested car class" />
        <textarea bind:value={form.notes} class="w-full rounded-lg border px-3 py-2 text-sm" rows="2" placeholder="Notes"></textarea>
      </div>

      <button
        class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={createBooking}
        disabled={saving}
      >{saving ? 'Savingâ€¦' : 'Create booking'}</button>

      <!-- Quick Assign -->
      <div class="border-t pt-4 space-y-3">
        <h3 class="text-sm font-semibold text-slate-700">Quick Assign</h3>
        <select bind:value={assignForm.bookingId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Select unassigned booking</option>
          {#each bookingOptions as b}
            <option value={b.id}>{b.label}</option>
          {/each}
        </select>
        <select bind:value={assignForm.driverId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Auto-pick active driver</option>
          {#each drivers as d}
            <option value={d.id}>{d.name}</option>
          {/each}
        </select>
        <select bind:value={assignForm.carId} class="w-full rounded-lg border px-3 py-2">
          <option value="">Auto-pick available car</option>
          {#each cars as c}
            <option value={c.id}>{c.label}</option>
          {/each}
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input bind:checked={assignForm.override} type="checkbox" />
          Override overlap conflict if needed
        </label>
        <button
          class="w-full rounded-lg bg-slate-900 text-white py-2 font-semibold disabled:opacity-60"
          on:click={assignBooking}
          disabled={assigning}
        >{assigning ? 'Assigningâ€¦' : 'Assign booking'}</button>
        {#if assignErrorMsg}
          <p class="text-sm text-amber-700">{assignErrorMsg}</p>
        {/if}
      </div>

      {#if errorMsg}
        <p class="text-sm text-red-600">{errorMsg}</p>
      {/if}

      {#if !customers.length || !locations.length}
        <p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Create customers and seed locations before creating bookings.
        </p>
      {/if}
    {/if}
  </section>

  <!-- Table panel -->
  <section class="space-y-3">
    <div class="flex gap-2">
      <input
        bind:value={search}
        on:input={() => (page = 0)}
        class="flex-1 rounded-lg border px-3 py-2 text-sm"
        placeholder="Search by customer, pickup or dropoffâ€¦"
      />
      <select bind:value={statusFilter} on:change={() => (page = 0)} class="rounded-lg border px-3 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="reserved">Reserved</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if loading}
        <p class="p-4 text-sm text-slate-500">Loading bookingsâ€¦</p>
      {:else if filtered.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">ðŸ“‹</p>
          <p class="text-sm text-slate-500">
            {allRows.length === 0 ? 'No bookings yet. Create your first booking.' : 'No bookings match your search.'}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">#</th>
                <th class="px-4 py-2 font-medium text-slate-600">Customer</th>
                <th class="px-4 py-2 font-medium text-slate-600">Pickup</th>
                <th class="px-4 py-2 font-medium text-slate-600">Dropoff</th>
                <th class="px-4 py-2 font-medium text-slate-600">Start</th>
                <th class="px-4 py-2 font-medium text-slate-600">Status</th>
                <th class="px-4 py-2 font-medium text-slate-600">Assigned</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each paginated as b (b.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === b.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 text-slate-500">{b.id}</td>
                  <td class="px-4 py-2 font-medium">{b.customer}</td>
                  <td class="px-4 py-2 text-slate-600">{b.pickup}</td>
                  <td class="px-4 py-2 text-slate-600">{b.dropoff}</td>
                  <td class="px-4 py-2 text-slate-600">{new Date(b.start).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td class="px-4 py-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {STATUS_BADGE[b.status]}">
                      {b.status}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-slate-500">{b.assigned}</td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs rounded border hover:bg-teal-50 hover:border-brand disabled:opacity-40"
                        disabled={b.status === 'cancelled'}
                        on:click={() => startEdit(b)}
                      >Edit</button>
                      <button
                        class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={b.status === 'cancelled' || cancelling === b.id}
                        on:click={() => cancelBooking(b.id)}
                      >{cancelling === b.id ? 'â€¦' : 'Cancel'}</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if totalPages > 1}
          <div class="flex items-center justify-between px-4 py-3 border-t text-sm">
            <button class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-40" on:click={() => page--} disabled={page === 0}>â† Prev</button>
            <span class="text-slate-500">Page {page + 1} of {totalPages} Â· {filtered.length} total</span>
            <button class="px-3 py-1 rounded border hover:bg-slate-50 disabled:opacity-40" on:click={() => page++} disabled={page >= totalPages - 1}>Next â†’</button>
          </div>
        {/if}
      {/if}
    </div>
  </section>
</div>
