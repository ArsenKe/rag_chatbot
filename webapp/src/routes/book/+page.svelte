<script lang="ts">
  import { onMount } from 'svelte';

  type LocationOption = {
    id: string;
    name: string;
    city?: string | null;
    type: string;
  };

  let loading = true;
  let submitting = false;
  let errorMsg = '';
  let successMsg = '';
  let bookingRef = '';

  let pickupLocations: LocationOption[] = [];
  let dropoffLocations: LocationOption[] = [];

  let form = {
    name: '',
    phone: '',
    pickupLocationId: '',
    dropoffLocationId: '',
    requestedStart: '',
    notes: ''
  };

  async function loadLocations() {
    loading = true;
    errorMsg = '';

    const res = await fetch('/api/bookings/public');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load booking form.';
      loading = false;
      return;
    }

    pickupLocations = (payload.data?.pickup ?? []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      city: item.city,
      type: item.type
    }));

    dropoffLocations = (payload.data?.dropoff ?? []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      city: item.city,
      type: item.type
    }));

    loading = false;
  }

  async function submitBooking() {
    submitting = true;
    errorMsg = '';
    successMsg = '';
    bookingRef = '';

    const requestedStartIso = new Date(form.requestedStart).toISOString();

    const res = await fetch('/api/bookings/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        pickupLocationId: form.pickupLocationId,
        dropoffLocationId: form.dropoffLocationId,
        requestedStart: requestedStartIso,
        notes: form.notes
      })
    });

    const payload = await res.json();
    submitting = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to submit booking request.';
      return;
    }

    bookingRef = payload.data?.booking?.id ? String(payload.data.booking.id) : '';
    successMsg = 'Booking request submitted successfully.';

    form = {
      name: '',
      phone: '',
      pickupLocationId: '',
      dropoffLocationId: '',
      requestedStart: '',
      notes: ''
    };

    if (payload.data?.notification?.status === 'error') {
      errorMsg = 'Booking was created, but WhatsApp confirmation could not be sent yet.';
    }
  }

  onMount(() => {
    void loadLocations();
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-10">
  <div class="mx-auto max-w-2xl rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
    <h1 class="text-2xl font-bold text-slate-900">Book Your Ride</h1>
    <p class="mt-2 text-sm text-slate-600">
      Submit your request and we will confirm your booking on WhatsApp.
    </p>

    {#if loading}
      <p class="mt-6 text-sm text-slate-500">Loading booking form...</p>
    {:else}
      <div class="mt-6 space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <input bind:value={form.name} class="rounded-lg border px-3 py-2" placeholder="Full name" />
          <input bind:value={form.phone} class="rounded-lg border px-3 py-2" placeholder="Phone (+49...)" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <select bind:value={form.pickupLocationId} class="rounded-lg border px-3 py-2">
            <option value="">Pickup location</option>
            {#each pickupLocations as loc}
              <option value={loc.id}>{loc.name}{loc.city ? ` · ${loc.city}` : ''}</option>
            {/each}
          </select>

          <select bind:value={form.dropoffLocationId} class="rounded-lg border px-3 py-2">
            <option value="">Dropoff location</option>
            {#each dropoffLocations as loc}
              <option value={loc.id}>{loc.name}{loc.city ? ` · ${loc.city}` : ''}</option>
            {/each}
          </select>
        </div>

        <input bind:value={form.requestedStart} class="w-full rounded-lg border px-3 py-2" type="datetime-local" />
        <textarea bind:value={form.notes} class="w-full rounded-lg border px-3 py-2" rows="4" placeholder="Optional notes"></textarea>

        <button
          class="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          on:click={submitBooking}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Booking Request'}
        </button>
      </div>
    {/if}

    {#if successMsg}
      <div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        {successMsg}
        {#if bookingRef}
          <div class="mt-1 font-medium">Reference: #{bookingRef}</div>
        {/if}
      </div>
    {/if}

    {#if errorMsg}
      <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
    {/if}
  </div>
</div>
