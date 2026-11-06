<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let selectedStatus: 'all' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' = data.filters.status;
  let selectedSort: 'recent' | 'upcoming' = data.filters.sortBy;

  const statusOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Confirmed', value: 'confirmed' as const },
    { label: 'In Progress', value: 'in_progress' as const },
    { label: 'Completed', value: 'completed' as const },
    { label: 'Cancelled', value: 'cancelled' as const }
  ];

  const sortOptions = [
    { label: 'Most Recent', value: 'recent' as const },
    { label: 'Upcoming', value: 'upcoming' as const }
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

  function getStatusBadgeClass(status: string): string {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'completed':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'in_progress':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'confirmed':
        return `${baseClass} bg-purple-100 text-purple-800`;
      case 'cancelled':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-slate-100 text-slate-800`;
    }
  }

  function getStatusLabel(status: string): string {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  function handleStatusChange(status: string) {
    selectedStatus = status as any;
    const url = new URL(window.location.href);
    url.searchParams.set('status', status);
    url.searchParams.delete('skip');
    window.location.href = url.toString();
  }

  function handleSortChange(sort: string) {
    selectedSort = sort as any;
    const url = new URL(window.location.href);
    url.searchParams.set('sortBy', sort);
    url.searchParams.delete('skip');
    window.location.href = url.toString();
  }

  function handlePageChange(newSkip: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('skip', newSkip.toString());
    window.location.href = url.toString();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-6xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">My Bookings</h1>
      <p class="text-lg text-slate-600">
        View and manage your booking and trip history with Royal E-Cars
      </p>
    </div>

    <!-- Customer Info Card -->
    <div class="mb-8 bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p class="text-sm text-slate-600 uppercase tracking-wide mb-1">Name</p>
          <p class="text-lg font-semibold text-slate-900">{data.customer.name}</p>
        </div>
        <div>
          <p class="text-sm text-slate-600 uppercase tracking-wide mb-1">Email</p>
          <p class="text-lg font-semibold text-slate-900">{data.customer.email}</p>
        </div>
        <div>
          <p class="text-sm text-slate-600 uppercase tracking-wide mb-1">Phone</p>
          <p class="text-lg font-semibold text-slate-900">{data.customer.phone || 'Not provided'}</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-8 bg-white rounded-lg shadow-md p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-3">Filter by Status</label>
          <div class="space-y-2">
            {#each statusOptions as option}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={selectedStatus === option.value}
                  on:change={() => handleStatusChange(option.value)}
                  class="w-4 h-4 text-blue-600"
                />
                <span class="ml-2 text-slate-700">{option.label}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Sort Options -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-3">Sort Order</label>
          <div class="space-y-2">
            {#each sortOptions as option}
              <label class="flex items-center">
                <input
                  type="radio"
                  name="sort"
                  value={option.value}
                  checked={selectedSort === option.value}
                  on:change={() => handleSortChange(option.value)}
                  class="w-4 h-4 text-blue-600"
                />
                <span class="ml-2 text-slate-700">{option.label}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Bookings List -->
    {#if data.trips.length === 0}
      <div class="bg-white rounded-lg shadow-md p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-xl text-slate-600 mb-2">No bookings found</p>
        <p class="text-slate-500">
          {selectedStatus === 'all' 
            ? "You haven't made any bookings yet. Start by making a new booking!"
            : `You have no ${selectedStatus.toLowerCase().replace('_', ' ')} bookings.`}
        </p>
      </div>
    {:else}
      <div class="space-y-4 mb-8">
        {#each data.trips as trip (trip.id)}
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow" transition:fade>
            <!-- Card Header -->
            <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-start">
              <div>
                <p class="text-sm text-slate-500 mb-1">Trip #{trip.id}</p>
                <p class="text-lg font-semibold text-slate-900">
                  {formatDate(trip.startTime)}
                </p>
              </div>
              <span class={getStatusBadgeClass(trip.status)}>
                {getStatusLabel(trip.status)}
              </span>
            </div>

            <!-- Card Body -->
            <div class="px-6 py-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Route Info -->
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-2">Route</p>
                  <div class="space-y-2">
                    <div class="flex items-start">
                      <span class="text-green-600 font-bold mr-3">📍</span>
                      <div>
                        <p class="font-medium text-slate-900">{trip.pickupLocation.name}</p>
                        <p class="text-sm text-slate-500">{trip.pickupLocation.address}</p>
                      </div>
                    </div>
                    <div class="flex items-start ml-2 text-slate-400">
                      <span class="text-lg">↓</span>
                    </div>
                    <div class="flex items-start">
                      <span class="text-red-600 font-bold mr-3">📍</span>
                      <div>
                        <p class="font-medium text-slate-900">{trip.dropoffLocation.name}</p>
                        <p class="text-sm text-slate-500">{trip.dropoffLocation.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Trip Details -->
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-2">Trip Details</p>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-slate-600">Duration:</span>
                      <span class="font-semibold text-slate-900">{trip.durationMinutes} minutes</span>
                    </div>
                    {#if trip.distanceKm}
                      <div class="flex justify-between">
                        <span class="text-slate-600">Distance:</span>
                        <span class="font-semibold text-slate-900">{trip.distanceKm} km</span>
                      </div>
                    {/if}
                    <div class="flex justify-between">
                      <span class="text-slate-600">Vehicle:</span>
                      <span class="font-semibold text-slate-900">
                        {trip.vehicle.make} {trip.vehicle.model}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Driver & Vehicle Info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-200">
                <!-- Driver -->
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-3">Driver</p>
                  <div class="flex items-center">
                    <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <span class="text-lg">👤</span>
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900">{trip.driver.name}</p>
                      {#if trip.driver.rating}
                        <p class="text-sm text-yellow-600">⭐ {trip.driver.rating}</p>
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- Vehicle Plate -->
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-3">Vehicle Details</p>
                  <div class="flex items-center">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                      <span class="text-lg">🚗</span>
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900">{trip.vehicle.licensePlate}</p>
                      <p class="text-sm text-slate-500">{trip.vehicle.year}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Pricing -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-3">Pricing Breakdown</p>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-slate-600">Fare:</span>
                      <span class="font-semibold text-slate-900">{formatCurrency(trip.pricing.fareAmount)}</span>
                    </div>
                    {#if trip.pricing.discountAmount !== '0'}
                      <div class="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span class="font-semibold">-{formatCurrency(trip.pricing.discountAmount)}</span>
                      </div>
                    {/if}
                    <div class="flex justify-between pt-2 border-t border-slate-200">
                      <span class="font-semibold text-slate-900">Total:</span>
                      <span class="text-xl font-bold text-blue-600">{formatCurrency(trip.pricing.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div>
                  <p class="text-xs text-slate-600 uppercase tracking-wide mb-3">Actions</p>
                  <div class="space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="text-slate-600">Payment Status:</span>
                      <span class={`font-semibold ${trip.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                        {trip.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                    {#if trip.hasInvoice}
                      <button class="w-full mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors">
                        📄 View Invoice
                      </button>
                    {/if}
                    {#if trip.reviewStatus === 'pending_review'}
                      <button class="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                        ⭐ Leave Review
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      <div class="flex justify-between items-center bg-white rounded-lg shadow-md p-6">
        <p class="text-slate-600">
          Showing {data.pagination.skip + 1} - {Math.min(data.pagination.skip + data.pagination.take, data.pagination.total)} of {data.pagination.total} bookings
        </p>
        <div class="flex gap-2">
          <button
            on:click={() => handlePageChange(Math.max(0, data.pagination.skip - data.pagination.take))}
            disabled={data.pagination.skip === 0}
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-900 rounded-lg font-medium transition-colors"
          >
            ← Previous
          </button>
          <button
            on:click={() => handlePageChange(data.pagination.skip + data.pagination.take)}
            disabled={!data.pagination.hasMore}
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-900 rounded-lg font-medium transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
