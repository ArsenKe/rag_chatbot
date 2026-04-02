<script lang="ts">
  import { onMount } from 'svelte';
  import ScheduleCalendar from '$lib/components/calendar/ScheduleCalendar.svelte';
  import { supabase } from '$lib/supabase/client';

  type BookingRow = {
    id: string;
    requestedStart: string;
    requestedEnd: string;
    status: string;
    customer?: { name?: string };
    trip?: { driverId?: string; carId?: string } | null;
  };

  let events: Array<{ title: string; start: string; end: string; driver: string; car: string }> = [];
  let loading = true;
  let errorMsg = '';
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function formatCalendarDate(value: string) {
    return new Date(value).toISOString().slice(0, 16).replace('T', ' ');
  }

  async function loadCalendar() {
    loading = true;
    errorMsg = '';

    const [bookingsRes, driversRes, carsRes] = await Promise.all([
      fetch('/api/bookings'),
      fetch('/api/drivers'),
      fetch('/api/cars')
    ]);

    const [bookingsPayload, driversPayload, carsPayload] = await Promise.all([
      bookingsRes.json(),
      driversRes.json(),
      carsRes.json()
    ]);

    if (!bookingsRes.ok || !driversRes.ok || !carsRes.ok) {
      errorMsg =
        bookingsPayload.error?.message ||
        driversPayload.error?.message ||
        carsPayload.error?.message ||
        'Failed to load calendar data';
      events = [];
      loading = false;
      return;
    }

    const drivers = new Map<string, string>(
      (driversPayload.data ?? []).map((driver: any) => [String(driver.id), String(driver.name)])
    );
    const cars = new Map<string, string>(
      (carsPayload.data ?? []).map((car: any) => [String(car.id), String(car.licensePlate)])
    );
    const bookings = (bookingsPayload.data ?? []) as BookingRow[];

    events = bookings.map((booking) => ({
      title: booking.customer?.name ? `${booking.customer.name} (${booking.status})` : `Booking ${booking.id}`,
      start: formatCalendarDate(booking.requestedStart),
      end: formatCalendarDate(booking.requestedEnd),
      driver: booking.trip?.driverId ? (drivers.get(booking.trip.driverId.toString()) ?? 'Unassigned') : 'Unassigned',
      car: booking.trip?.carId ? (cars.get(booking.trip.carId.toString()) ?? 'Unassigned') : 'Unassigned'
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
{#if errorMsg}
  <p class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
{/if}

{#if loading}
  <p class="text-sm text-slate-500">Loading calendar...</p>
{:else}
  <ScheduleCalendar {events} />
{/if}
