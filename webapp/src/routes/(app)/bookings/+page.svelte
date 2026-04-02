<script lang="ts">
  import { onMount } from 'svelte';
  import DataTable from '$lib/components/tables/DataTable.svelte';
  import { supabase } from '$lib/supabase/client';

  let rows: Array<Record<string, unknown>> = [];
  let bookingOptions: Array<{ id: string; label: string }> = [];
  let customers: Array<{ id: string; name: string }> = [];
  let locations: Array<{ id: string; label: string }> = [];
  let drivers: Array<{ id: string; name: string }> = [];
  let cars: Array<{ id: string; label: string }> = [];
  let loading = true;
  let saving = false;
  let assigning = false;
  let errorMsg = '';
  let assignErrorMsg = '';
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  let form = {
    customerId: '',
    pickupLocationId: '',
    dropoffLocationId: '',
    requestedStart: '',
    requestedEnd: '',
    carClass: '',
    notes: ''
  };

  let assignForm = {
    bookingId: '',
    driverId: '',
    carId: '',
    override: false
  };

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
      rows = [];
      bookingOptions = [];
      customers = [];
      locations = [];
      drivers = [];
      cars = [];
      loading = false;
      return;
    }

    customers = (customersPayload.data ?? []).map((customer: any) => ({
      id: customer.id.toString(),
      name: customer.name
    }));
    locations = (locationsPayload.data ?? []).map((location: any) => ({
      id: location.id.toString(),
      label: [location.name, location.city].filter(Boolean).join(' · ')
    }));

    drivers = (driversPayload.data ?? []).map((driver: any) => ({
      id: driver.id.toString(),
      name: driver.name
    }));

    cars = (carsPayload.data ?? []).map((car: any) => ({
      id: car.id.toString(),
      label: [car.licensePlate, car.model].filter(Boolean).join(' · ')
    }));

    const bookings = bookingsPayload.data ?? [];
    bookingOptions = bookings
      .filter((b: any) => b.status !== 'cancelled' && !b.trip)
      .map((b: any) => ({
        id: b.id.toString(),
        label: `${b.id} · ${b.customer?.name ?? 'Unknown customer'} · ${b.status}`
      }));

    rows = bookings.map((b: any) => ({
      id: b.id,
      customer: b.customer?.name ?? b.customerId,
      pickup: b.pickupLocation?.name,
      dropoff: b.dropoffLocation?.name,
      start: b.requestedStart,
      end: b.requestedEnd,
      status: b.status,
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

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to create booking';
      return;
    }

    form = {
      customerId: '',
      pickupLocationId: '',
      dropoffLocationId: '',
      requestedStart: '',
      requestedEnd: '',
      carClass: '',
      notes: ''
    };
    await loadBookings();
  }

  async function assignBooking() {
    assignErrorMsg = '';

    if (!assignForm.bookingId) {
      assignErrorMsg = 'Select a booking to assign.';
      return;
    }

    const bookingId = assignForm.bookingId;
    const previousRows = rows;

    rows = rows.map((row) =>
      String(row.id) === bookingId
        ? {
            ...row,
            status: 'assigning...'
          }
        : row
    );

    assigning = true;
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        driverId: assignForm.driverId || undefined,
        carId: assignForm.carId || undefined,
        override: assignForm.override
      })
    });

    const payload = await res.json();
    assigning = false;

    if (!res.ok) {
      rows = previousRows;
      assignErrorMsg = payload.error?.message ?? 'Failed to assign booking';
      return;
    }

    rows = rows.map((row) =>
      String(row.id) === bookingId
        ? {
            ...row,
            status: 'confirmed',
            assigned: 'yes'
          }
        : row
    );

    assignForm = {
      bookingId: '',
      driverId: '',
      carId: '',
      override: false
    };

    void queueRefresh();
  }

  function queueRefresh() {
    if (refreshTimer) {
      return;
    }

    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      await loadBookings();
    }, 250);
  }

  onMount(() => {
    void loadBookings();

    const channel = supabase
      .channel('bookings-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = String((payload as { table?: string }).table ?? '').toLowerCase();
        if (table === 'booking' || table === 'trip' || table === 'driver') {
          void queueRefresh();
        }
      })
      .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  });
</script>

<div class="grid gap-6 lg:grid-cols-[420px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">Bookings</h2>
      <p class="text-sm text-slate-500 mt-1">Create operational bookings using real customers and locations.</p>
    </div>

    <div class="space-y-3">
      <select bind:value={form.customerId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Select customer</option>
        {#each customers as customer}
          <option value={customer.id}>{customer.name}</option>
        {/each}
      </select>

      <select bind:value={form.pickupLocationId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Pickup location</option>
        {#each locations as location}
          <option value={location.id}>{location.label}</option>
        {/each}
      </select>

      <select bind:value={form.dropoffLocationId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Dropoff location</option>
        {#each locations as location}
          <option value={location.id}>{location.label}</option>
        {/each}
      </select>

      <input bind:value={form.requestedStart} class="w-full rounded-lg border px-3 py-2" type="datetime-local" />
      <input bind:value={form.requestedEnd} class="w-full rounded-lg border px-3 py-2" type="datetime-local" />
      <input bind:value={form.carClass} class="w-full rounded-lg border px-3 py-2" placeholder="Requested car class" />
      <textarea bind:value={form.notes} class="w-full rounded-lg border px-3 py-2" rows="3" placeholder="Notes"></textarea>
    </div>

    <button class="w-full bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60" on:click={createBooking} disabled={saving}>
      {saving ? 'Saving...' : 'Create booking'}
    </button>

    <div class="border-t pt-4 space-y-3">
      <h3 class="text-sm font-semibold text-slate-700">Quick Assign</h3>

      <select bind:value={assignForm.bookingId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Select unassigned booking</option>
        {#each bookingOptions as booking}
          <option value={booking.id}>{booking.label}</option>
        {/each}
      </select>

      <select bind:value={assignForm.driverId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Auto-pick active driver</option>
        {#each drivers as driver}
          <option value={driver.id}>{driver.name}</option>
        {/each}
      </select>

      <select bind:value={assignForm.carId} class="w-full rounded-lg border px-3 py-2">
        <option value="">Auto-pick available car</option>
        {#each cars as car}
          <option value={car.id}>{car.label}</option>
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
      >
        {assigning ? 'Assigning...' : 'Assign booking'}
      </button>
    </div>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    {#if assignErrorMsg}
      <p class="text-sm text-red-600">{assignErrorMsg}</p>
    {/if}

    {#if !customers.length || !locations.length}
      <p class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        Create customers and seed locations before creating bookings.
      </p>
    {/if}
  </section>

  <section>
    {#if loading}
      <p class="text-sm text-slate-500">Loading bookings...</p>
    {:else}
      <DataTable title="Bookings & Assignment Queue" {rows} />
    {/if}
  </section>
</div>
