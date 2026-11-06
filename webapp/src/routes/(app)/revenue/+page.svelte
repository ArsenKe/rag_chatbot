<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let selectedPeriod: 'day' | 'week' | 'month' | 'all' = 'month';
  let customStartDate = '';
  let customEndDate = '';
  let isLoadingCustom = false;

  const periodButtons = [
    { label: 'Today', value: 'day' as const },
    { label: 'This Week', value: 'week' as const },
    { label: 'This Month', value: 'month' as const },
    { label: 'All Time', value: 'all' as const }
  ];

  function formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(num);
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  async function handlePeriodChange(period: 'day' | 'week' | 'month' | 'all') {
    selectedPeriod = period;
    const url = new URL(window.location.href);
    url.searchParams.set('period', period);
    url.searchParams.delete('startDate');
    url.searchParams.delete('endDate');
    window.location.href = url.toString();
  }

  async function handleCustomDateRange() {
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('Start date must be before end date');
      return;
    }

    isLoadingCustom = true;
    const url = new URL(window.location.href);
    url.searchParams.set('period', 'custom');
    url.searchParams.set('startDate', customStartDate);
    url.searchParams.set('endDate', customEndDate);
    window.location.href = url.toString();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Platform Revenue Dashboard</h1>
      <p class="text-lg text-slate-600">
        Real-time overview of platform commission, top earners, and operational metrics
      </p>
    </div>

    <!-- Period Selector -->
    <div class="mb-8 bg-white rounded-lg shadow-md p-6">
      <div class="flex flex-wrap gap-3 mb-6">
        {#each periodButtons as btn}
          <button
            on:click={() => handlePeriodChange(btn.value)}
            class={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedPeriod === btn.value
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {btn.label}
          </button>
        {/each}
      </div>

      <!-- Custom Date Range -->
      <div class="border-t pt-6">
        <h3 class="font-semibold text-slate-900 mb-4">Custom Date Range</h3>
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              bind:value={customStartDate}
              class="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              bind:value={customEndDate}
              class="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            on:click={handleCustomDateRange}
            disabled={isLoadingCustom}
            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 font-medium transition-colors"
          >
            {isLoadingCustom ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- Total Revenue Card -->
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-slate-600 uppercase tracking-wide">Total Revenue</h3>
          <svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.16 5a.75.75 0 00-.712 1.05l1.952 3.9a.75.75 0 00.67.45h2.183a.75.75 0 00.67-.45l1.952-3.9A.75.75 0 0012.84 5H8.16z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-slate-900 mb-2">
          {formatCurrency(data.summary.totalRevenue)}
        </p>
        <p class="text-xs text-slate-500">
          {data.summary.completedTripsCount} completed trips • {formatCurrency(
            data.summary.averageFarePerTrip
          )}/trip avg
        </p>
      </div>

      <!-- Platform Commission Card -->
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-slate-600 uppercase tracking-wide">
            Platform Commission (20%)
          </h3>
          <svg class="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p class="text-3xl font-bold text-slate-900 mb-2">
          {formatCurrency(data.summary.totalPlatformFee)}
        </p>
        <p class="text-xs text-slate-500">
          {formatCurrency(data.summary.averagePlatformFeePerTrip)}/trip avg
        </p>
      </div>

      <!-- Driver Payouts Card -->
      <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-slate-600 uppercase tracking-wide">Driver Payouts (80%)</h3>
          <svg class="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </div>
        <p class="text-3xl font-bold text-slate-900 mb-2">
          {formatCurrency(data.summary.totalDriverPayout)}
        </p>
        <p class="text-xs text-slate-500">Distributed to {data.topEarners.length} drivers</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Top Earners Table -->
      <div class="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
        <div class="p-6 border-b border-slate-200">
          <h2 class="text-xl font-bold text-slate-900">Top 10 Earning Drivers</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trips</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Avg/Trip</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total Earning</th>
              </tr>
            </thead>
            <tbody>
              {#each data.topEarners as driver (driver.driverId)}
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                  <td class="px-6 py-4 font-medium text-slate-900">{driver.driverName}</td>
                  <td class="px-6 py-4 text-slate-600">{driver.tripsCount}</td>
                  <td class="px-6 py-4 text-right text-slate-900 font-medium">
                    {formatCurrency(driver.averagePerTrip)}
                  </td>
                  <td class="px-6 py-4 text-right font-bold text-emerald-600">
                    {formatCurrency(driver.driverPayout)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Fleet Performance -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Fleet Breakdown</h2>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          {#each data.vehicleBreakdown as vehicle (vehicle.carId)}
            <div class="p-3 bg-slate-50 rounded-lg">
              <div class="flex justify-between items-start mb-2">
                <p class="font-medium text-slate-900 text-sm">{vehicle.carName}</p>
                <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {vehicle.tripsCount} trips
                </span>
              </div>
              <div class="flex justify-between text-xs text-slate-600">
                <span>Commission: {formatCurrency(vehicle.platformFee)}</span>
                <span>Revenue: {formatCurrency(vehicle.revenue)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Recent Trips -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="p-6 border-b border-slate-200">
        <h2 class="text-xl font-bold text-slate-900">Recent Completed Trips</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date & Time</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vehicle</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Fare</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Commission</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Driver Payout</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recentTrips as trip (trip.id)}
              <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                <td class="px-6 py-4 text-sm text-slate-900">
                  {trip.startTime ? formatDate(trip.startTime) : 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">{trip.customerName}</td>
                <td class="px-6 py-4 text-sm text-slate-600">{trip.driverName}</td>
                <td class="px-6 py-4 text-sm text-slate-600">{trip.vehicleInfo}</td>
                <td class="px-6 py-4 text-sm text-right font-medium text-slate-900">
                  {formatCurrency(trip.totalAmount)}
                </td>
                <td class="px-6 py-4 text-sm text-right font-medium text-emerald-600">
                  {formatCurrency(trip.platformFee)}
                </td>
                <td class="px-6 py-4 text-sm text-right font-medium text-purple-600">
                  {formatCurrency(trip.driverPayout)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
