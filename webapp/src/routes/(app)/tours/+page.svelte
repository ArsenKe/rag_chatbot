<script lang="ts">
  import { onMount } from 'svelte';

  type Stop = { id: string; name: string; order: number; imageUrl: string | null; audioUrl: string | null };
  type Tier = 'silver' | 'gold' | 'platinum';

  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' }
  ];

  let stops: Stop[] = [];
  let loadingStops = true;
  let errorMsg = '';

  let tier: Tier | null = 'silver';
  let guestCount = 2;
  let language = 'en';
  let starting = false;

  let activeTourId: string | null = null;
  let playingStopId: string | null = null;

  let summary: { price: number; commission: number } | null = null;
  let ending = false;

  function safeMoney(value: unknown): number {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }

  async function loadStops() {
    loadingStops = true;
    const res = await fetch('/api/tour-stops');
    const payload = await res.json();
    if (res.ok) {
      stops = payload.data ?? [];
    } else {
      errorMsg = payload.error?.message ?? 'Failed to load tour stops';
    }
    loadingStops = false;
  }

  async function startTour() {
    if (!tier) {
      errorMsg = 'Select a tour tier first.';
      return;
    }

    errorMsg = '';
    starting = true;

    const res = await fetch('/api/tours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, guestCount, language })
    });

    const payload = await res.json();
    starting = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to start tour';
      return;
    }

    activeTourId = String(payload.data.id);
  }

  function playStop(stop: Stop) {
    playingStopId = stop.id;
  }

  async function endTour() {
    if (!activeTourId) return;

    ending = true;
    const res = await fetch(`/api/tours/${activeTourId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });

    const payload = await res.json();
    ending = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to end tour';
      return;
    }

    summary = {
      price: safeMoney(payload.data?.priceAmount),
      commission: safeMoney(payload.data?.commissionAmount)
    };

    activeTourId = null;
    playingStopId = null;
  }

  function startAnotherTour() {
    summary = null;
    tier = 'silver';
    guestCount = 2;
    language = 'en';
  }

  onMount(() => {
    void loadStops();
  });
</script>

<div class="min-h-screen bg-[linear-gradient(180deg,#1fa0ff_0%,#1b9be0_100%)] text-white">
  {#if errorMsg}
    <div class="px-4 pt-4">
      <p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
    </div>
  {/if}

  {#if summary}
    <div class="mx-auto flex min-h-screen max-w-md flex-col justify-between px-4 py-5">
      <header class="flex items-center justify-between px-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-xl">⚙</div>
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-xl">✓</div>
      </header>

      <div class="flex flex-1 flex-col items-center justify-center text-center">
        <h2 class="mb-8 text-5xl font-black tracking-tight">AMAZING TOUR!</h2>
        <p class="text-3xl font-light text-white/90">The price of this tour is:</p>
        <p class="my-4 text-7xl font-black leading-none">{summary.price.toFixed(1)}€</p>
        <p class="text-2xl font-light text-white/95">Your commission {summary.commission.toFixed(1)}€</p>
      </div>

      <div class="pb-2">
        <div class="mb-6 h-28 w-full rounded-t-[32px] bg-[#1f8fe7] opacity-80">
          <div class="flex h-full items-end justify-center gap-3 px-2 pb-1">
            {#each Array(12) as _, i}
              <div class="w-5 rounded-t-lg bg-[#0d5fa8] opacity-90" style={`height: ${20 + ((i % 5) * 12)}px`}></div>
            {/each}
          </div>
        </div>

        <button
          class="w-full rounded-[28px] border border-white/70 bg-[#0f9dff] px-4 py-4 text-3xl font-black tracking-wide text-white shadow-lg"
          on:click={startAnotherTour}
        >
          Start a new tour
        </button>
      </div>
    </div>
  {:else if activeTourId}
    <div class="mx-auto max-w-md px-4 py-5">
      <header class="mb-4 flex items-center justify-between">
        <div class="text-2xl font-bold">Tour Stops</div>
        <button class="rounded-full border border-white/70 px-3 py-1 text-sm">⋮</button>
      </header>

      {#if loadingStops}
        <p class="text-sm text-white/80">Loading stops...</p>
      {:else}
        <div class="grid grid-cols-2 gap-4">
          {#each stops as stop, i (stop.id)}
            <button
              class="overflow-hidden rounded-[28px] border border-white/70 bg-white/10 text-left transition hover:scale-[1.01]"
              on:click={() => playStop(stop)}
            >
              <div class="relative aspect-[1.1] bg-slate-200">
                {#if stop.imageUrl}
                  <img src={stop.imageUrl} alt={stop.name} class="h-full w-full object-cover" />
                {:else}
                  <div class="flex h-full items-center justify-center bg-[radial-gradient(circle,#dbeafe,#94a3b8)] text-4xl text-white/80">▶</div>
                {/if}
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-2xl text-slate-700 shadow-md">
                    ▶
                  </div>
                </div>
              </div>
              <p class="px-3 py-3 text-center text-lg font-black uppercase tracking-tight text-white">{i + 1}. {stop.name}</p>
            </button>
          {/each}
        </div>

        {#if playingStopId}
          {#each stops.filter((s) => s.id === playingStopId) as stop (stop.id)}
            <div class="mt-5 rounded-[24px] border border-white/70 bg-white/10 p-4">
              <p class="mb-2 text-base font-semibold text-white">Now playing: {stop.name}</p>
              {#if stop.audioUrl}
                <audio controls autoplay class="w-full" src={stop.audioUrl}></audio>
              {:else}
                <p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Audio for this stop is not uploaded yet.
                </p>
              {/if}
            </div>
          {/each}
        {/if}
      {/if}

      <button
        class="mt-6 flex w-full items-center justify-center gap-3 rounded-[28px] border border-white/70 bg-[#0f8ae6] px-4 py-4 text-3xl font-black tracking-wide shadow-lg"
        on:click={endTour}
        disabled={ending}
      >
        <span>{ending ? 'Ending…' : 'END TOUR'}</span>
      </button>
    </div>
  {:else}
    <div class="mx-auto max-w-md px-4 py-5">
      <header class="mb-6 flex items-center justify-between px-2">
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-xl">⚙</div>
        <div class="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 text-xl">→</div>
      </header>

      <div class="space-y-5">
        <button
          class="w-full rounded-[34px] border-2 border-white/90 bg-transparent py-4 text-3xl font-black uppercase tracking-wide text-white shadow-sm transition {tier === 'silver' ? 'bg-white/10' : ''}"
          on:click={() => (tier = 'silver')}
        >
          Silver
        </button>

        <button
          class="w-full rounded-[34px] border-2 border-white/90 bg-transparent py-4 text-3xl font-black uppercase tracking-wide text-white shadow-sm transition {tier === 'gold' ? 'bg-white/10' : ''}"
          on:click={() => (tier = 'gold')}
        >
          Gold
        </button>

        <button
          class="w-full rounded-[34px] border-2 border-white/90 bg-transparent py-4 text-3xl font-black uppercase tracking-wide text-white shadow-sm transition {tier === 'platinum' ? 'bg-white/10' : ''}"
          on:click={() => (tier = 'platinum')}
        >
          Platinum
        </button>
      </div>

      <div class="mt-10 border-b border-white/80 pb-3 text-center">
        <label for="guest-count" class="block text-2xl font-light uppercase tracking-wide text-white/95">Number of people</label>
      </div>

      <div class="mt-6 flex items-center justify-center gap-4">
        <input
          id="guest-count"
          type="number"
          min="1"
          max="20"
          bind:value={guestCount}
          class="w-20 rounded-lg border border-white/50 bg-transparent px-3 py-2 text-center text-4xl font-bold text-white outline-none"
        />
      </div>

      <div class="mt-8 flex items-center justify-center gap-4">
        <label class="text-4xl" for="tour-language">{LANGUAGES.find((item) => item.code === language)?.flag ?? '🇬🇧'}</label>
        <select
          id="tour-language"
          bind:value={language}
          class="appearance-none border-none bg-transparent text-4xl font-medium text-white outline-none"
        >
          {#each LANGUAGES as item}
            <option value={item.code} class="text-slate-900">{item.label}</option>
          {/each}
        </select>
      </div>

      <div class="mt-10">
        <button
          class="flex w-full items-center justify-center gap-4 rounded-[28px] border border-white/70 bg-[#0f8ae6] px-4 py-4 text-3xl font-black tracking-wide shadow-xl disabled:opacity-60"
          on:click={startTour}
          disabled={starting || !tier}
        >
          <span>{starting ? 'Starting…' : 'START TOUR'}</span>
        </button>
      </div>
    </div>
  {/if}
</div>
