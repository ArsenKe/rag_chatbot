<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let showAssignmentModal = false;
  let selectedTrip: any = null;
  let selectedDriver: any = null;

  function formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(num);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function formatTime(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('de-AT', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function openAssignmentModal(trip: any) {
    selectedTrip = trip;
    selectedDriver = null;
    showAssignmentModal = true;
  }

  function closeModal() {
    showAssignmentModal = false;
    selectedTrip = null;
    selectedDriver = null;
  }

  async function assignTripToDriver() {
    if (!selectedTrip || !selectedDriver) return;

    try {
      const response = await fetch(`/api/trips/${selectedTrip.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver.id })
      });

      if (!response.ok) throw new Error('Assignment failed');

      closeModal();
      window.location.reload(); // Refresh to see updated state
    } catch (err) {
      alert(`Assignment failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Dispatch Dashboard</h1>
      <p class="text-lg text-slate-600">Real-time driver assignment and trip monitoring</p>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-emerald-500">
        <p class="text-sm text-slate-600 font-medium">Available Drivers</p>
        <p class="text-3xl font-bold text-emerald-600">{data.stats.totalAvailableDrivers}</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
        <p class="text-sm text-slate-600 font-medium">On Trip</p>
        <p class="text-3xl font-bold text-blue-600">{data.stats.driversOnTrip}</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
        <p class="text-sm text-slate-600 font-medium">Pending Trips</p>
        <p class="text-3xl font-bold text-orange-600">{data.stats.pendingTripsCount}</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
        <p class="text-sm text-slate-600 font-medium">Active Trips</p>
        <p class="text-3xl font-bold text-purple-600">{data.stats.activeTripsCount}</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
        <p class="text-sm text-slate-600 font-medium">Completed Today</p>
        <p class="text-3xl font-bold text-green-600">{data.stats.completedTodayCount}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Available Drivers Panel -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="bg-emerald-50 border-b-2 border-emerald-200 px-6 py-4">
          <h2 class="text-lg font-bold text-emerald-900">Available Drivers ({data.availableDrivers.length})</h2>
        </div>
        <div class="p-4 max-h-96 overflow-y-auto space-y-2">
          {#if data.availableDrivers.length === 0}
            <p class="text-center text-slate-500 py-8">No drivers available</p>
          {:else}
            {#each data.availableDrivers as driver (driver.id)}
              <div class="p-3 bg-slate-50 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer border-l-4 border-emerald-500">
                <div class="flex justify-between items-start mb-1">
                  <p class="font-semibold text-slate-900">{driver.name}</p>
                  {#if driver.rating}
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⭐ {driver.rating}</span>
                  {/if}
                </div>
                <p class="text-xs text-slate-600">{driver.phone ?? 'No phone'}</p>
                <div class="flex justify-between text-xs text-slate-500 mt-1">
                  <span>✓ {driver.acceptedTripsCount} trips</span>
                  <span>✗ {driver.cancelledTripsCount} cancelled</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Active Trips Panel -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden lg:col-span-2">
        <div class="bg-purple-50 border-b-2 border-purple-200 px-6 py-4">
          <h2 class="text-lg font-bold text-purple-900">Active Trips ({data.activeTrips.length})</h2>
        </div>
        <div class="p-4 max-h-96 overflow-y-auto space-y-3">
          {#if data.activeTrips.length === 0}
            <p class="text-center text-slate-500 py-8">No active trips</p>
          {:else}
            {#each data.activeTrips as trip (trip.id)}
              <div class="p-3 bg-slate-50 rounded-lg border-l-4 border-purple-500">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <p class="font-semibold text-slate-900">{trip.customerName}</p>
                    <p class="text-xs text-slate-600">{trip.driverName} • {trip.vehicleInfo}</p>
                  </div>
                  <span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">In Progress</span>
                </div>
                <div class="flex items-center gap-2 mb-2">
                  <div class="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      class="bg-purple-600 h-2 rounded-full transition-all"
                      style="width: {trip.progressPercent}%"
                    />
                  </div>
                  <span class="text-xs text-slate-600">{Math.round(trip.progressPercent)}%</span>
                </div>
                <p class="text-xs text-slate-600">
                  {trip.pickupLocation} → {trip.dropoffLocation}
                </p>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Pending Trips Section -->
    {#if data.pendingTrips.length > 0}
      <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div class="bg-orange-50 border-b-2 border-orange-200 px-6 py-4">
          <h2 class="text-lg font-bold text-orange-900">Pending Trips Awaiting Assignment ({data.pendingTrips.length})</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trip ID</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Scheduled</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Route</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Assigned Driver</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Fare</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {#each data.pendingTrips as trip (trip.id)}
                <tr class="border-b border-slate-100 hover:bg-orange-50 transition-colors" transition:fade>
                  <td class="px-6 py-4 text-sm font-mono text-slate-900">#{trip.id.slice(0, 8)}</td>
                  <td class="px-6 py-4 text-sm">
                    <div>
                      <p class="font-medium text-slate-900">{trip.customerName}</p>
                      <p class="text-xs text-slate-600">{trip.customerPhone}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">
                    {formatDate(trip.requestedStart)}
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">
                    <div class="flex flex-col gap-1">
                      <span class="text-green-600 font-medium">📍 {trip.pickupLocation.name}</span>
                      <span class="text-red-600 font-medium">📍 {trip.dropoffLocation.name}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-center">
                    {#if trip.assignedDriver}
                      <span class="text-blue-600 font-medium">{trip.assignedDriver.name}</span>
                    {:else}
                      <span class="text-orange-600 font-semibold">⚠️ Not Assigned</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 text-sm text-right font-semibold text-slate-900">
                    {formatCurrency(trip.totalAmount)}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button
                      on:click={() => openAssignmentModal(trip)}
                      class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- Drivers on Trip Summary -->
    {#if data.driversOnTrip.length > 0}
      <div class="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div class="bg-blue-50 border-b-2 border-blue-200 px-6 py-4">
          <h2 class="text-lg font-bold text-blue-900">Drivers Currently On Trip ({data.driversOnTrip.length})</h2>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each data.driversOnTrip as driver (driver.id)}
              <div class="p-4 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <p class="font-semibold text-slate-900">{driver.name}</p>
                    <p class="text-xs text-slate-600">{driver.phone}</p>
                  </div>
                  <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">On Trip</span>
                </div>
                {#if driver.currentTrip}
                  <div class="space-y-2">
                    <div>
                      <p class="text-xs text-slate-600 font-medium">Customer</p>
                      <p class="text-sm font-semibold text-slate-900">{driver.currentTrip.customerName}</p>
                    </div>
                    <div>
                      <p class="text-xs text-slate-600 font-medium">Route</p>
                      <p class="text-xs text-slate-700">
                        {driver.currentTrip.pickupLocation} → {driver.currentTrip.dropoffLocation}
                      </p>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span class="text-slate-600">Duration: {driver.currentTrip.estimatedDuration} min</span>
                      <span class="text-slate-600">Started: {formatTime(driver.currentTrip.startTime)}</span>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Completed Trips Today -->
    {#if data.completedTripsToday.length > 0}
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="bg-green-50 border-b-2 border-green-200 px-6 py-4">
          <h2 class="text-lg font-bold text-green-900">Completed Today ({data.completedTripsToday.length})</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Completed At</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Fare</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Commission</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Driver Payout</th>
              </tr>
            </thead>
            <tbody>
              {#each data.completedTripsToday as trip (trip.id)}
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                  <td class="px-6 py-4 text-sm text-slate-600">{formatTime(trip.endTime)}</td>
                  <td class="px-6 py-4 text-sm font-medium text-slate-900">{trip.customerName}</td>
                  <td class="px-6 py-4 text-sm text-slate-600">{trip.driverName}</td>
                  <td class="px-6 py-4 text-sm text-right font-semibold text-slate-900">
                    {formatCurrency(trip.totalAmount)}
                  </td>
                  <td class="px-6 py-4 text-sm text-right text-emerald-600 font-semibold">
                    {formatCurrency(trip.platformFee)}
                  </td>
                  <td class="px-6 py-4 text-sm text-right text-purple-600 font-semibold">
                    {formatCurrency(trip.driverPayout)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Assignment Modal -->
{#if showAssignmentModal && selectedTrip}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6" transition:fade>
      <div class="mb-6">
        <h3 class="text-2xl font-bold text-slate-900 mb-2">Assign Trip to Driver</h3>
        <p class="text-slate-600">
          Trip: {selectedTrip.customerName} • {formatDate(selectedTrip.requestedStart)}
        </p>
      </div>

      <div class="mb-6 p-4 bg-slate-50 rounded-lg">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-slate-600 font-medium mb-1">PICKUP</p>
            <p class="font-semibold text-slate-900">{selectedTrip.pickupLocation.name}</p>
            <p class="text-xs text-slate-600">{selectedTrip.pickupLocation.address}</p>
          </div>
          <div>
            <p class="text-xs text-slate-600 font-medium mb-1">DROPOFF</p>
            <p class="font-semibold text-slate-900">{selectedTrip.dropoffLocation.name}</p>
            <p class="text-xs text-slate-600">{selectedTrip.dropoffLocation.address}</p>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-slate-900 mb-3">Select Driver</label>
        <div class="space-y-2 max-h-80 overflow-y-auto">
          {#each data.availableDrivers as driver (driver.id)}
            <label class="flex items-start p-3 bg-slate-50 hover:bg-blue-50 rounded-lg cursor-pointer border-2 transition-colors" class:border-blue-500={selectedDriver?.id === driver.id} class:border-slate-200={selectedDriver?.id !== driver.id}>
              <input
                type="radio"
                name="driver"
                value={driver.id}
                bind:group={selectedDriver}
                on:change={() => { selectedDriver = driver; }}
                class="w-4 h-4 mt-1"
              />
              <div class="ml-3 flex-1">
                <p class="font-semibold text-slate-900">{driver.name}</p>
                <p class="text-xs text-slate-600">{driver.phone}</p>
                <div class="flex gap-2 mt-1">
                  {#if driver.rating}
                    <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">⭐ {driver.rating}</span>
                  {/if}
                  <span class="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">{driver.acceptedTripsCount} trips</span>
                </div>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          on:click={closeModal}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={assignTripToDriver}
          disabled={!selectedDriver}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          Assign Trip
        </button>
      </div>
    </div>
  </div>
{/if}

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
