<script lang="ts">
  import { fade } from 'svelte/transition';

  export let tripId: string;
  export let driverName: string = 'Driver';
  export let onSuccess: () => void = () => {};
  export let onCancel: () => void = () => {};

  let rating: number = 5;
  let title: string = '';
  let comment: string = '';
  let isAnonymous: boolean = false;
  let isSubmitting: boolean = false;
  let submitError: string = '';

  async function submitReview() {
    if (!rating) {
      submitError = 'Please select a rating';
      return;
    }

    isSubmitting = true;
    submitError = '';

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: parseInt(tripId),
          type: 'ride',
          rating,
          title: title || null,
          comment: comment || null,
          isAnonymous
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to submit review');
      }

      onSuccess();
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Failed to submit review';
    } finally {
      isSubmitting = false;
    }
  }

  function setRating(value: number) {
    rating = value;
  }

  function renderStars(count: number): string {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
  <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8" transition:fade>
    <h2 class="text-3xl font-bold text-slate-900 mb-2">Rate Your Trip</h2>
    <p class="text-slate-600 mb-6">Tell us about your experience with {driverName}</p>

    {#if submitError}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700 text-sm font-semibold">{submitError}</p>
      </div>
    {/if}

    <!-- Rating Section -->
    <div class="mb-8 p-6 bg-slate-50 rounded-lg">
      <p class="text-sm font-semibold text-slate-900 mb-4">How would you rate this trip?</p>
      <div class="flex gap-3 text-5xl">
        {#each [1, 2, 3, 4, 5] as star (star)}
          <button
            on:click={() => setRating(star)}
            class="transition-transform hover:scale-110 cursor-pointer"
            title={`${star} stars`}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        {/each}
      </div>
      <p class="mt-4 text-lg font-semibold text-blue-600">{rating} out of 5 stars</p>
    </div>

    <!-- Title (Optional) -->
    <div class="mb-6">
      <label class="block text-sm font-semibold text-slate-900 mb-2">Review Title (Optional)</label>
      <input
        type="text"
        bind:value={title}
        placeholder="e.g., Great service, Clean car"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Comment (Optional) -->
    <div class="mb-6">
      <label class="block text-sm font-semibold text-slate-900 mb-2">Additional Comments (Optional)</label>
      <textarea
        bind:value={comment}
        placeholder="Share more details about your experience..."
        rows="4"
        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Anonymous Checkbox -->
    <div class="mb-8 flex items-center gap-3">
      <input
        type="checkbox"
        bind:checked={isAnonymous}
        id="anonymous-review"
        class="w-4 h-4 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
      />
      <label for="anonymous-review" class="text-sm text-slate-700">Leave this review anonymously</label>
    </div>

    <!-- Buttons -->
    <div class="flex justify-end gap-3">
      <button
        on:click={onCancel}
        disabled={isSubmitting}
        class="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        Skip
      </button>
      <button
        on:click={submitReview}
        disabled={isSubmitting || !rating}
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  </div>
</div>

<style>
  :global(body) {
    overflow: hidden;
  }
</style>
