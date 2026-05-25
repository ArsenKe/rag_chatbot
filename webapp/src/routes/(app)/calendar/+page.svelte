<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import ScheduleCalendar from '$lib/components/calendar/ScheduleCalendar.svelte';
  import { supabase } from '$lib/supabase/client';

  type BookingRow = {
    id: string;
    requestedStart: string;
    requestedEnd: string;
    status: string;
    customer?: { name?: string };
    trip?: { driver?: { name?: string }; car?: { licensePlate?: string } } | null;
  };

  let events: Array<{ title: string; start: string; end: string; driver: string; car: string }> = [];
  let loading = true;
  let errorMsg = '';
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  $: isDriver = $page.data.user?.role === 'driver';
  $: hasDriverMapping = Boolean($page.data.user?.driverId);

  function formatCalendarDate(value: string) {
    return new Date(value).toISOString().slice(0, 16).replace('T', ' ');
  }

  async function loadCalendar() {
      if (isDriver && !hasDriverMapping) {
        events = [];
        loading = false;
        errorMsg = '';
        return;
      }

    loading = true;
    errorMsg = '';

    const bookingsRes = await fetch('/api/bookings');
    const bookingsPayload = await bookingsRes.json();

    if (!bookingsRes.ok) {
      errorMsg = bookingsPayload.error?.message || 'Failed to load calendar data';
      events = [];
      loading = false;
      return;
    }

    const bookings = (bookingsPayload.data ?? []) as BookingRow[];

    events = bookings.map((booking) => ({
      title: booking.customer?.name ? `${booking.customer.name} (${booking.status})` : `Booking ${booking.id}`,
      start: formatCalendarDate(booking.requestedStart),
      end: formatCalendarDate(booking.requestedEnd),
      driver: booking.trip?.driver?.name ?? 'Unassigned',
      car: booking.trip?.car?.licensePlate ?? 'Unassigned'
    }));

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

<h2 class="text-xl font-semibold mb-4">Schedule Calendar</h2>
{#if isDriver && !hasDriverMapping}
  <p class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    Your driver account is not linked to a driver profile yet. Ask admin to link your account in Users.
  </p>
{/if}
{#if errorMsg}
  <p class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
{/if}

{#if loading}
  <p class="text-sm text-slate-500">Loading calendar...</p>
{:else}
  <ScheduleCalendar {events} />
{/if}
