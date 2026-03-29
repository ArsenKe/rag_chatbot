<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];

  async function loadBookings() {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    rows = (data.data ?? []).map((b: any) => ({
      id: b.id,
      customerId: b.customerId,
      pickup: b.pickupLocation?.name,
      dropoff: b.dropoffLocation?.name,
      start: b.requestedStart,
      end: b.requestedEnd,
      status: b.status
    }));
  }

  loadBookings();
</script>

<h2 class="text-xl font-semibold mb-4">Bookings & Assignment Queue</h2>
<DataTable title="Bookings" {rows} />
