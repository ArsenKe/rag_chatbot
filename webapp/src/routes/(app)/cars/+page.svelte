<script lang="ts">
  import DataTable from '$lib/components/tables/DataTable.svelte';

  let rows: Array<Record<string, unknown>> = [];

  async function loadCars() {
    const res = await fetch('/api/cars');
    const data = await res.json();
    rows = data.data ?? [];
  }

  loadCars();
</script>

<h2 class="text-xl font-semibold mb-4">Cars</h2>
<DataTable title="Car Fleet" {rows} />
