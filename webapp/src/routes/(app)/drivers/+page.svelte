<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];
  let loading = true;

  async function loadDrivers() {
    loading = true;
    const res = await fetch('/api/drivers');
    const data = await res.json();
    rows = data.data ?? [];
    loading = false;
  }

  loadDrivers();
</script>

<h2 class="text-xl font-semibold mb-4">Drivers</h2>
{#if loading}
  <p class="text-sm text-slate-500">Loading...</p>
{:else}
  <DataTable title="Driver Management" {rows} />
{/if}
