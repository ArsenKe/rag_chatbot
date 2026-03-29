<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let type = 'revenue_daily';

  async function runReport() {
    const res = await fetch(`/api/reports?type=${type}`);
    const data = await res.json();
    rows = data.data ?? [];
  }

  runReport();
</script>

<h2 class="text-xl font-semibold mb-4">Analytics Reports (Star Schema)</h2>

<div class="mb-4 flex gap-2 items-center">
  <select bind:value={type} class="border rounded-lg px-3 py-2">
    <option value="revenue_daily">Daily Revenue</option>
    <option value="driver_performance">Driver Performance</option>
    <option value="car_utilization">Car Utilization</option>
    <option value="top_locations">Top Pickup Locations</option>
  </select>
  <button class="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg" on:click={runReport}>Run</button>
</div>

<DataTable title="Report Result" {rows} />
