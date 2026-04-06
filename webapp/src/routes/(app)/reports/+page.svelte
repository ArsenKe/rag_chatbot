<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';

  // â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  interface Summary { totalRevenue: number; tripCount: number; avgFare: number; avgDuration: number; }
  interface RevenueDayRow { day: string; trips: number; revenue: number; }
  interface DriverRow { name: string; trips: number; earnings: number; avgDuration: number; }
  interface CarRow { licensePlate: string; make: string; model: string; tripCount: number; totalRevenue: number; }
  interface LocationRow { name: string; city: string | null; pickups: number; }
  interface ReportData {
    summary: Summary;
    revenueTrend: RevenueDayRow[];
    drivers: DriverRow[];
    cars: CarRow[];
    locations: LocationRow[];
    from: string;
    to: string;
  }

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let report: ReportData | null = null;
  let loading = false;
  let errorMsg = '';
  let activeTab: 'drivers' | 'cars' | 'locations' = 'drivers';

  const today = new Date();
  const prior = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  let fromDate = prior.toISOString().slice(0, 10);
  let toDate = today.toISOString().slice(0, 10);

  // â”€â”€ Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let revenueCanvas: HTMLCanvasElement;
  let detailCanvas: HTMLCanvasElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let revenueChart: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let detailChart: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ChartClass: any = null;

  onMount(async () => {
    const {
      Chart, CategoryScale, LinearScale, LineElement, PointElement,
      BarElement, Tooltip, Legend, Filler
    } = await import('chart.js');
    Chart.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Tooltip, Legend, Filler);
    ChartClass = Chart;
    await loadData();
  });

  onDestroy(() => {
    revenueChart?.destroy();
    detailChart?.destroy();
  });

  async function loadData() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/reports?from=${fromDate}&to=${toDate}`);
      const payload = await res.json();
      if (!res.ok) {
        errorMsg = payload?.error?.message ?? 'Failed to load report';
        return;
      }
      report = payload.data;
      await tick();
      drawCharts();
    } catch {
      errorMsg = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function drawCharts() {
    if (!ChartClass || !report) return;
    drawRevenueChart();
    drawDetailChart();
  }

  function drawRevenueChart() {
    revenueChart?.destroy();
    if (!revenueCanvas || !report) return;
    const labels = report.revenueTrend.map((r) => r.day);
    const revenues = report.revenueTrend.map((r) => r.revenue);
    revenueChart = new ChartClass(revenueCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (EUR)',
          data: revenues,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13,148,136,0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: revenues.length > 20 ? 2 : 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => `EUR ${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
          y: { ticks: { callback: (v: number) => `â‚¬${v}` } }
        }
      }
    });
  }

  function drawDetailChart() {
    detailChart?.destroy();
    if (!detailCanvas || !report) return;

    let labels: string[] = [];
    let values: number[] = [];
    let dataLabel = '';
    let color = '#0d9488';

    if (activeTab === 'drivers') {
      labels = report.drivers.map((d) => d.name);
      values = report.drivers.map((d) => d.earnings);
      dataLabel = 'Earnings (EUR)'; color = '#0d9488';
    } else if (activeTab === 'cars') {
      labels = report.cars.map((c) => `${c.make} ${c.licensePlate}`);
      values = report.cars.map((c) => c.tripCount);
      dataLabel = 'Trips'; color = '#6366f1';
    } else {
      labels = report.locations.map((l) => l.name);
      values = report.locations.map((l) => l.pickups);
      dataLabel = 'Pickups'; color = '#f59e0b';
    }

    detailChart = new ChartClass(detailCanvas, {
      type: 'bar',
      data: { labels, datasets: [{ label: dataLabel, data: values, backgroundColor: color, borderRadius: 4 }] },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { callback: (v: number) => (activeTab === 'drivers' ? `â‚¬${v}` : String(v)) } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  $: if (activeTab && report && ChartClass) tick().then(drawDetailChart);

  function exportCSV() {
    if (!report) return;
    let rows: Record<string, unknown>[] = [];
    let filename = '';
    if (activeTab === 'drivers') {
      rows = report.drivers.map((d) => ({ Name: d.name, Trips: d.trips, 'Earnings (EUR)': d.earnings.toFixed(2), 'Avg Duration (min)': d.avgDuration }));
      filename = `driver-performance-${fromDate}-${toDate}.csv`;
    } else if (activeTab === 'cars') {
      rows = report.cars.map((c) => ({ 'License Plate': c.licensePlate, Make: c.make, Model: c.model, Trips: c.tripCount, 'Revenue (EUR)': c.totalRevenue.toFixed(2) }));
      filename = `car-utilization-${fromDate}-${toDate}.csv`;
    } else {
      rows = report.locations.map((l) => ({ Name: l.name, City: l.city ?? '', Pickups: l.pickups }));
      filename = `top-locations-${fromDate}-${toDate}.csv`;
    }
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(String(r[h] ?? ''))).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = filename;
    a.click();
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('en-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
</script>

<div class="space-y-5">
  <!-- Filter bar -->
  <div class="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
    <div>
      <label for="rpt-from" class="block text-xs text-slate-500 mb-1">From</label>
      <input id="rpt-from" type="date" bind:value={fromDate} class="border rounded-lg px-3 py-2 text-sm" />
    </div>
    <div>
      <label for="rpt-to" class="block text-xs text-slate-500 mb-1">To</label>
      <input id="rpt-to" type="date" bind:value={toDate} class="border rounded-lg px-3 py-2 text-sm" />
    </div>
    <button class="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50" on:click={loadData} disabled={loading}>
      {loading ? 'Loadingâ€¦' : 'Run Report'}
    </button>
    {#if report}
      <button class="ml-auto border border-slate-200 hover:border-brand hover:text-brand px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors" on:click={exportCSV}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
        Export CSV
      </button>
    {/if}
  </div>

  {#if errorMsg}
    <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMsg}</div>
  {/if}

  {#if loading && !report}
    <div class="bg-white rounded-xl border p-10 text-center text-sm text-slate-400">Loading reportâ€¦</div>
  {/if}

  {#if report}
    <!-- Summary tiles -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs uppercase text-slate-500 mb-1">Total Revenue</p>
        <p class="text-2xl font-bold text-brand">â‚¬{fmt(report.summary.totalRevenue)}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs uppercase text-slate-500 mb-1">Trips Completed</p>
        <p class="text-2xl font-bold">{report.summary.tripCount}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs uppercase text-slate-500 mb-1">Avg Fare</p>
        <p class="text-2xl font-bold">â‚¬{fmt(report.summary.avgFare)}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs uppercase text-slate-500 mb-1">Avg Trip Duration</p>
        <p class="text-2xl font-bold">{report.summary.avgDuration} min</p>
      </div>
    </div>

    <!-- Revenue trend line chart -->
    <div class="bg-white rounded-xl border p-5">
      <h2 class="font-semibold mb-3">Revenue Trend</h2>
      {#if report.revenueTrend.length === 0}
        <p class="text-sm text-slate-400 py-8 text-center">No trip data for this period.</p>
      {:else}
        <div class="h-56"><canvas bind:this={revenueCanvas}></canvas></div>
      {/if}
    </div>

    <!-- Detail section -->
    <div class="bg-white rounded-xl border overflow-hidden">
      <div class="flex border-b">
        {#each [['drivers','Top Drivers'],['cars','Car Utilization'],['locations','Top Locations']] as [key, label]}
          <button
            class="px-5 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}"
            on:click={() => (activeTab = key as typeof activeTab)}
          >{label}</button>
        {/each}
      </div>

      <div class="p-5 space-y-5">
        {#if (activeTab === 'drivers' && report.drivers.length > 0) || (activeTab === 'cars' && report.cars.length > 0) || (activeTab === 'locations' && report.locations.length > 0)}
          <div class="h-56"><canvas bind:this={detailCanvas}></canvas></div>
        {:else}
          <p class="text-sm text-slate-400 py-6 text-center">No data for this period.</p>
        {/if}

        {#if activeTab === 'drivers' && report.drivers.length > 0}
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left"><tr>
              <th class="px-4 py-2 font-medium text-slate-600">Driver</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Trips</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Earnings</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Avg Duration</th>
            </tr></thead>
            <tbody>
              {#each report.drivers as row}
                <tr class="border-t hover:bg-slate-50">
                  <td class="px-4 py-2 font-medium">{row.name}</td>
                  <td class="px-4 py-2 text-right">{row.trips}</td>
                  <td class="px-4 py-2 text-right font-medium text-brand">â‚¬{fmt(row.earnings)}</td>
                  <td class="px-4 py-2 text-right text-slate-500">{row.avgDuration} min</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if activeTab === 'cars' && report.cars.length > 0}
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left"><tr>
              <th class="px-4 py-2 font-medium text-slate-600">Plate</th>
              <th class="px-4 py-2 font-medium text-slate-600">Make / Model</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Trips</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Revenue</th>
            </tr></thead>
            <tbody>
              {#each report.cars as row}
                <tr class="border-t hover:bg-slate-50">
                  <td class="px-4 py-2 font-mono">{row.licensePlate}</td>
                  <td class="px-4 py-2">{row.make} {row.model}</td>
                  <td class="px-4 py-2 text-right">{row.tripCount}</td>
                  <td class="px-4 py-2 text-right font-medium text-brand">â‚¬{fmt(row.totalRevenue)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if activeTab === 'locations' && report.locations.length > 0}
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left"><tr>
              <th class="px-4 py-2 font-medium text-slate-600">Location</th>
              <th class="px-4 py-2 font-medium text-slate-600">City</th>
              <th class="px-4 py-2 font-medium text-slate-600 text-right">Pickups</th>
            </tr></thead>
            <tbody>
              {#each report.locations as row}
                <tr class="border-t hover:bg-slate-50">
                  <td class="px-4 py-2 font-medium">{row.name}</td>
                  <td class="px-4 py-2 text-slate-500">{row.city ?? 'â€”'}</td>
                  <td class="px-4 py-2 text-right">{row.pickups}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  {/if}
</div>
