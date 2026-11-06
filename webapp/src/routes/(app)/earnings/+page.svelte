<script lang="ts">
  import type { PageData } from './$types';

  interface EarningsSummary {
    totalTrips: number;
    totalGrossRevenue: string;
    totalPlatformFees: string;
    totalEarnings: string;
    averagePerTrip: string;
  }

  interface Trip {
    id: string;
    startTime: string;
    endTime: string;
    totalAmount: string;
    platformFee: string;
    driverPayout: string;
    customerName: string;
    pickupLocation: string;
    dropoffLocation: string;
  }

  export let data: PageData;

  let period: 'all' | 'month' | 'week' = (data.period as any) || 'all';
  let loading = false;
  let earnings: { summary: EarningsSummary; trips: Trip[]; totalCount: number; pageSize: number } | null = data.earnings;
  let error: string | null = null;
  let page = data.page || 1;

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-AT', {
      month: 'short',
      day: 'numeric',
      year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('de-AT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDurationMinutes = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round(diffMs / 60000);
  };

  async function loadEarnings() {
    loading = true;
    error = null;
    try {
      const response = await fetch(
        `/api/earnings/driver/${data.userId}?period=${period}&skip=${(page - 1) * 20}&take=20`
      );

      if (!response.ok) throw new Error('Failed to fetch earnings');

      earnings = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error loading earnings';
      console.error('Error loading earnings:', err);
    } finally {
      loading = false;
    }
  }

  async function changePeriod(newPeriod: 'all' | 'month' | 'week') {
    period = newPeriod;
    page = 1;
    await loadEarnings();
  }

  async function changePage(newPage: number) {
    page = newPage;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await loadEarnings();
  }

  const totalPages = earnings ? Math.ceil(earnings.totalCount / earnings.pageSize) : 1;
</script>

<div class="max-w-7xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-slate-900 mb-4">My Earnings</h1>
    
    <!-- Period Selector -->
    <div class="flex gap-2">
      {#each [
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'All Time', value: 'all' }
      ] as btn}
        <button
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          class:bg-blue-600={period === btn.value}
          class:text-white={period === btn.value}
          class:bg-slate-100={period !== btn.value}
          class:text-slate-700={period !== btn.value}
          class:hover:bg-slate-200={period !== btn.value}
          on:click={() => changePeriod(btn.value as any)}
          disabled={loading}
        >
          {btn.label}
        </button>
      {/each}
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
      {error}
    </div>
  {/if}

  {#if loading && !earnings}
    <div class="flex items-center justify-center py-12">
      <div class="inline-block animate-spin">
        <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    </div>
  {:else if earnings}
    <!-- Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <p class="text-slate-600 text-sm font-medium mb-2">Total Earnings</p>
        <p class="text-3xl font-bold text-green-600">{formatCurrency(earnings.summary.totalEarnings)}</p>
        <p class="text-slate-500 text-xs mt-2">{earnings.summary.totalTrips} trips</p>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <p class="text-slate-600 text-sm font-medium mb-2">Gross Revenue</p>
        <p class="text-3xl font-bold text-slate-900">{formatCurrency(earnings.summary.totalGrossRevenue)}</p>
        <p class="text-slate-500 text-xs mt-2">Total fares</p>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <p class="text-slate-600 text-sm font-medium mb-2">Platform Fees</p>
        <p class="text-3xl font-bold text-red-600">{formatCurrency(earnings.summary.totalPlatformFees)}</p>
        <p class="text-slate-500 text-xs mt-2">20% commission</p>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <p class="text-slate-600 text-sm font-medium mb-2">Average per Trip</p>
        <p class="text-3xl font-bold text-blue-600">{formatCurrency(earnings.summary.averagePerTrip)}</p>
        <p class="text-slate-500 text-xs mt-2">Your net share</p>
      </div>
    </div>

    <!-- Earnings Breakdown -->
    <div class="bg-white rounded-lg border border-slate-200 mb-8">
      <div class="px-6 py-4 border-b">
        <h2 class="text-lg font-semibold text-slate-900">Trip Breakdown</h2>
      </div>

      {#if earnings.trips.length === 0}
        <div class="px-6 py-12 text-center text-slate-500">
          <p>No completed trips in this period</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b">
                <th class="px-6 py-3 text-left font-semibold text-slate-700">Date & Time</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-700">Duration</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-700">Route</th>
                <th class="px-6 py-3 text-right font-semibold text-slate-700">Fare</th>
                <th class="px-6 py-3 text-right font-semibold text-slate-700">Fee (20%)</th>
                <th class="px-6 py-3 text-right font-semibold text-slate-700">Your Earnings</th>
              </tr>
            </thead>
            <tbody>
              {#each earnings.trips as trip (trip.id)}
                <tr class="border-b hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="text-slate-900 font-medium">
                      {formatDate(trip.startTime)}
                    </div>
                    <div class="text-slate-500 text-xs">
                      {formatTime(trip.startTime)}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-slate-700">
                    {getDurationMinutes(trip.startTime, trip.endTime)} min
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-slate-900 font-medium">{trip.customerName}</div>
                  </td>
                  <td class="px-6 py-4 text-slate-700 text-xs max-w-xs">
                    <div class="truncate" title={trip.pickupLocation}>
                      📍 {trip.pickupLocation}
                    </div>
                    <div class="truncate mt-1" title={trip.dropoffLocation}>
                      📍 {trip.dropoffLocation}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(trip.totalAmount)}
                  </td>
                  <td class="px-6 py-4 text-right font-medium text-red-600">
                    -{formatCurrency(trip.platformFee)}
                  </td>
                  <td class="px-6 py-4 text-right font-bold text-green-600">
                    {formatCurrency(trip.driverPayout)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="px-6 py-4 border-t flex items-center justify-center gap-2">
            {#if page > 1}
              <button
                class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium"
                on:click={() => changePage(page - 1)}
                disabled={loading}
              >
                Previous
              </button>
            {/if}

            {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, page - 2);
              return start + i;
            }) as pageNum}
              {#if pageNum <= totalPages}
                <button
                  class="px-3 py-2 rounded-lg text-sm font-medium"
                  class:bg-blue-600={pageNum === page}
                  class:text-white={pageNum === page}
                  class:border={pageNum !== page}
                  class:border-slate-300={pageNum !== page}
                  class:hover:bg-slate-50={pageNum !== page}
                  on:click={() => changePage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              {/if}
            {/each}

            {#if page < totalPages}
              <button
                class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium"
                on:click={() => changePage(page + 1)}
                disabled={loading}
              >
                Next
              </button>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Withdrawal Section -->
    <div class="bg-white rounded-lg border border-slate-200 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-slate-900 mb-1">Request Withdrawal</h3>
          <p class="text-slate-600 text-sm">Available Balance: <span class="font-bold text-green-600">{formatCurrency(earnings.summary.totalEarnings)}</span></p>
        </div>
        <button class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
          Request Withdrawal
        </button>
      </div>
    </div>
  {/if}
</div>
