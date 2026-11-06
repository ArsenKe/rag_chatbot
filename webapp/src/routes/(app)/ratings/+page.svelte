<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let selectedTab: 'overall' | 'ride' | 'tour' = 'overall';

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function getStarClass(rating: number): string {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 4) return 'text-blue-500';
    if (rating >= 3) return 'text-yellow-500';
    if (rating >= 2) return 'text-orange-500';
    return 'text-red-500';
  }

  function getRatingBadgeClass(rating: number): string {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    if (rating === 5) return `${baseClass} bg-green-100 text-green-800`;
    if (rating === 4) return `${baseClass} bg-blue-100 text-blue-800`;
    if (rating === 3) return `${baseClass} bg-yellow-100 text-yellow-800`;
    if (rating === 2) return `${baseClass} bg-orange-100 text-orange-800`;
    return `${baseClass} bg-red-100 text-red-800`;
  }

  function renderStars(rating: number): string {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  $: currentData =
    selectedTab === 'overall'
      ? data.overall
      : selectedTab === 'ride'
        ? data.ride
        : data.tour;
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">My Ratings & Reviews</h1>
      <p class="text-lg text-slate-600">See how customers and guests rate you</p>
    </div>

    <!-- Tabs -->
    <div class="mb-8 flex gap-2 border-b border-slate-300">
      {#each ['overall', 'ride', 'tour'] as tab (tab)}
        <button
          on:click={() => (selectedTab = tab)}
          class="px-6 py-3 font-semibold transition-all"
          class:border-b-4={selectedTab === tab}
          class:border-b-blue-600={selectedTab === tab}
          class:text-blue-600={selectedTab === tab}
          class:text-slate-600={selectedTab !== tab}
          class:hover:text-slate-900={selectedTab !== tab}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          <span class="ml-2 text-sm">({data[tab as keyof typeof data].totalReviews})</span>
        </button>
      {/each}
    </div>

    <!-- Rating Summary Cards -->
    {#if currentData.totalReviews === 0}
      <div class="bg-white rounded-lg shadow-md p-12 text-center mb-8">
        <p class="text-2xl font-semibold text-slate-600 mb-2">No reviews yet</p>
        <p class="text-slate-500">
          {selectedTab === 'overall'
            ? 'Your reviews will appear here once customers and guests rate you'
            : selectedTab === 'ride'
              ? 'Your ride reviews will appear here'
              : 'Your tour reviews will appear here'}
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Average Rating Card -->
        <div
          class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-8 border border-blue-200"
        >
          <p class="text-sm text-blue-600 font-semibold mb-3">AVERAGE RATING</p>
          <div class="flex items-center gap-4">
            <div class="text-6xl font-bold" class:text-green-600={currentData.averageRating >= 4}>
              {currentData.averageRating.toFixed(1)}
            </div>
            <div>
              <p class="text-xl text-blue-800 mb-1">{renderStars(Math.round(currentData.averageRating))}</p>
              <p class="text-sm text-blue-600">Based on {currentData.totalReviews} reviews</p>
            </div>
          </div>
        </div>

        <!-- Rating Distribution -->
        <div class="bg-white rounded-lg shadow-md p-8 border border-slate-200">
          <p class="text-sm text-slate-600 font-semibold mb-4">RATING DISTRIBUTION</p>
          {#each [5, 4, 3, 2, 1] as stars (stars)}
            <div class="flex items-center gap-3 mb-3">
              <span class="text-sm font-semibold text-slate-700 w-12">{stars}★</span>
              <div class="flex-1 bg-slate-200 rounded-full h-2">
                <div
                  class="bg-blue-500 h-2 rounded-full transition-all"
                  style="width: {currentData.totalReviews > 0
                    ? ((currentData.ratingDistribution[stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one'] / currentData.totalReviews) * 100).toFixed(0) + '%'
                    : '0%'}"
                />
              </div>
              <span class="text-sm text-slate-600 w-8">
                {currentData.ratingDistribution[stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one']}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Reviews List -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 class="text-xl font-bold text-slate-900">Recent Reviews</h2>
        </div>

        <div class="divide-y divide-slate-100">
          {#each currentData.reviews || [] as review (review.createdAt)}
            <div class="p-6 hover:bg-slate-50 transition-colors" transition:fade>
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class={getRatingBadgeClass(review.rating)}>{review.rating}★</span>
                  <div>
                    <p class="font-semibold text-slate-900">{review.title || 'No title'}</p>
                    <p class="text-sm text-slate-500">{review.reviewerEmail}</p>
                  </div>
                </div>
                <p class="text-sm text-slate-500">{formatDate(review.createdAt)}</p>
              </div>

              {#if review.comment}
                <p class="text-slate-700 bg-slate-50 rounded p-3 italic">"{review.comment}"</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Tips Section -->
    {#if currentData.averageRating < 4}
      <div class="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
        <p class="font-semibold text-yellow-900 mb-2">💡 Ways to improve your ratings:</p>
        <ul class="text-yellow-800 space-y-1 text-sm">
          <li>• Maintain clean and well-maintained vehicles</li>
          <li>• Provide professional and courteous service</li>
          <li>• Communicate clearly with passengers</li>
          <li>• Take safe and efficient routes</li>
          <li>• Keep your vehicle on time for pick-ups</li>
        </ul>
      </div>
    {/if}
  </div>
</div>

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
