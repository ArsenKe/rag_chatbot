<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ScheduleCalendar from '$lib/components/calendar/ScheduleCalendar.svelte';
  import VisualCalendar from '$lib/components/calendar/VisualCalendar.svelte';
  import { supabase } from '$lib/supabase/client';

  type BookingRow = {
    id: string;
    requestedStart: string;
    requestedEnd: string;
    status: string;
    customer?: { name?: string };
    pickupLocation?: { name?: string };
    dropoffLocation?: { name?: string };
    trip?: { driver?: { name?: string }; car?: { licensePlate?: string } } | null;
  };

  type BlockedSlot = {
    id: string;
    shiftStart: string;
    shiftEnd: string;
    isAvailable: boolean;
  };

  type CalendarEvent = {
    bookingId?: string;
    title: string;
    start: string;
    end: string;
    status?: string;
    customerName?: string;
    pickup?: string;
    dropoff?: string;
    driver?: string;
    car?: string;
    source?: 'app' | 'google';
  };

  let events: CalendarEvent[] = [];
  let googleEvents: CalendarEvent[] = [];
  let blockedSlots: BlockedSlot[] = [];
  let loading = true;
  let loadingGoogle = false;
  let savingBlock = false;
  let errorMsg = '';
  let successMsg = '';
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let googleConnected = false;

  let blockForm = {
    shiftStart: '',
    shiftEnd: ''
  };

  $: isDriver = $page.data.user?.role === 'driver';
  $: hasDriverMapping = Boolean($page.data.user?.driverId);
  $: allEvents = [...events, ...googleEvents];

  function formatCalendarDate(value: string) {
    return new Date(value).toISOString().slice(0, 16).replace('T', ' ');
  }

  async function answerAssignment(bookingId: string, status: 'confirmed' | 'cancelled') {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const payload = await res.json();
    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to update assignment status';
      return;
    }

    errorMsg = '';
    await loadCalendar();
  }

  async function saveBlock() {
    if (!blockForm.shiftStart || !blockForm.shiftEnd) {
      errorMsg = 'Pick both start and end times.';
      return;
    }

    savingBlock = true;
    errorMsg = '';

    const res = await fetch('/api/driver-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftStart: new Date(blockForm.shiftStart).toISOString(),
        shiftEnd: new Date(blockForm.shiftEnd).toISOString()
      })
    });

    const payload = await res.json();
    savingBlock = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to block time';
      return;
    }

    blockForm = { shiftStart: '', shiftEnd: '' };
    await loadCalendar();
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/driver-availability?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = await res.json();
    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to remove block';
      return;
    }

    await loadCalendar();
  }

  async function connectGoogleCalendar() {
    const authUrl = await fetch('/api/google-calendar/auth').then(r => r.json());
    if (authUrl.data?.url) {
      window.location.href = authUrl.data.url;
    }
  }

  async function syncGoogleCalendar() {
    loadingGoogle = true;
    errorMsg = '';
    successMsg = '';

    const res = await fetch('/api/google-calendar/sync');
    const payload = await res.json();
    loadingGoogle = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to sync Google Calendar';
      return;
    }

    googleEvents = (payload.data ?? []).map((event: any) => ({
      title: event.title,
      start: event.start,
      end: event.end,
      source: 'google' as const
    }));

    successMsg = 'Google Calendar synced successfully!';
    setTimeout(() => { successMsg = ''; }, 3000);
  }

  async function disconnectGoogleCalendar() {
    if (!confirm('Disconnect Google Calendar?')) return;

    const res = await fetch('/api/google-calendar/sync', { method: 'DELETE' });
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to disconnect';
      return;
    }

    googleConnected = false;
    googleEvents = [];
    successMsg = 'Google Calendar disconnected';
    setTimeout(() => { successMsg = ''; }, 3000);
  }

  async function loadCalendar() {
    if (isDriver && !hasDriverMapping) {
      events = [];
      blockedSlots = [];
      loading = false;
      errorMsg = '';
      return;
    }

    loading = true;
    errorMsg = '';

    const [bookingsRes, availabilityRes] = await Promise.all([
      fetch('/api/bookings'),
      isDriver ? fetch('/api/driver-availability') : Promise.resolve(new Response(JSON.stringify({ data: { blockedSlots: [] } }), { status: 200 }))
    ]);

    const bookingsPayload = await bookingsRes.json();
    const availabilityPayload = await availabilityRes.json();

    if (!bookingsRes.ok) {
      errorMsg = bookingsPayload.error?.message || 'Failed to load calendar data';
      events = [];
      blockedSlots = [];
      loading = false;
      return;
    }

    const bookings = (bookingsPayload.data ?? []) as BookingRow[];
    const availability = (availabilityPayload.data?.blockedSlots ?? []) as BlockedSlot[];

    events = bookings.map((booking) => ({
      bookingId: String(booking.id),
      title: booking.customer?.name ? `${booking.customer.name}` : `Booking ${booking.id}`,
      start: formatCalendarDate(booking.requestedStart),
      end: formatCalendarDate(booking.requestedEnd),
      status: String(booking.status ?? 'reserved'),
      customerName: booking.customer?.name ?? `Customer ${booking.id}`,
      pickup: booking.pickupLocation?.name ?? 'Pickup not set',
      dropoff: booking.dropoffLocation?.name ?? 'Dropoff not set',
      driver: booking.trip?.driver?.name ?? 'Assigned to you',
      car: booking.trip?.car?.licensePlate ?? 'Pending'
    }));

    blockedSlots = availability;
    loading = false;
  }

  function queueRefresh() {
    if (refreshTimer) {
      return;
    }

    refreshTimer = setTimeout(async () => {
      refreshTimer = null;
      await loadCalendar();
    }, 250);
  }

  onMount(() => {
    void loadCalendar();

    const channel = supabase
      .channel('calendar-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = String((payload as { table?: string }).table ?? '').toLowerCase();
        if (table === 'booking' || table === 'trip' || table === 'driver' || table === 'driveravailability') {
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

<h2 class="text-xl font-semibold mb-4">Assigned Jobs & Availability</h2>
{#if isDriver && !hasDriverMapping}
  <p class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    Your driver account is not linked to a driver profile yet. Ask admin to link your account in Users.
  </p>
{/if}
{#if errorMsg}
  <p class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
{/if}

{#if isDriver}
  <div class="mb-5 rounded-xl border bg-white p-4 shadow-sm">
    <h3 class="mb-3 font-semibold">Block unavailable hours</h3>
    <div class="grid gap-3 md:grid-cols-2">
      <input bind:value={blockForm.shiftStart} type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
      <input bind:value={blockForm.shiftEnd} type="datetime-local" class="w-full rounded-lg border px-3 py-2" />
    </div>
    <button
      class="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      on:click={saveBlock}
      disabled={savingBlock}
    >
      {savingBlock ? 'Saving...' : 'Block this time'}
    </button>

    {#if blockedSlots.length > 0}
      <div class="mt-4 space-y-2">
        <p class="text-sm font-medium text-slate-700">Blocked times</p>
        {#each blockedSlots as block}
          <div class="flex items-center justify-between rounded-lg border bg-slate-50 p-2 text-xs text-slate-700">
            <span>{new Date(block.shiftStart).toLocaleString()} → {new Date(block.shiftEnd).toLocaleString()}</span>
            <button class="rounded border border-red-200 px-2 py-1 text-red-600" on:click={() => removeBlock(block.id)}>
              Remove
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if loading}
  <p class="text-sm text-slate-500">Loading assigned jobs...</p>
{:else}
  <!-- Visual Calendar -->
  <div class="mb-6">
    <VisualCalendar events={allEvents} />
  </div>

  {#if isDriver}
    <!-- Google Calendar Integration -->
    <div class="mb-6 rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="font-semibold">Google Calendar Integration</h3>
          <p class="text-xs text-slate-500 mt-1">Sync your Google Calendar events to see all appointments in one place</p>
        </div>
        {#if googleConnected}
          <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Connected</span>
        {/if}
      </div>

      {#if successMsg}
        <p class="mb-3 rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-700">{successMsg}</p>
      {/if}

      <div class="flex gap-2">
        {#if googleConnected}
          <button
            class="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            on:click={syncGoogleCalendar}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? 'Syncing...' : '🔄 Sync Calendar'}
          </button>
          <button
            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            on:click={disconnectGoogleCalendar}
          >
            Disconnect
          </button>
        {:else}
          <button
            class="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            on:click={connectGoogleCalendar}
          >
            🔗 Connect Google Calendar
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- List View -->
  <div class="rounded-xl border bg-white p-4 shadow-sm">
    <h3 class="mb-3 font-semibold">Assigned Jobs</h3>
    <ScheduleCalendar
      events={events}
      onAccept={(bookingId) => answerAssignment(bookingId, 'confirmed')}
      onReject={(bookingId) => answerAssignment(bookingId, 'cancelled')}
    />
    />
  </div>
{/if}
