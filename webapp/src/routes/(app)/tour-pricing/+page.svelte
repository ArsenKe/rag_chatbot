<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type PricingConfig = {
    id: bigint;
    tier: 'silver' | 'gold' | 'platinum';
    minGuests: number;
    maxGuests: number;
    basePricePerTour: number;
    pricePerAdditionalGuestBeyond: number;
    durationMinutes: number;
    driverCommissionPercentage: number;
  };

  let configs: PricingConfig[] = [];
  let loading = true;
  let error = '';
  let editingId: string | null = null;

  let formData: {
    tier: 'silver' | 'gold' | 'platinum';
    minGuests: number;
    maxGuests: number;
    basePricePerTour: number;
    pricePerAdditionalGuestBeyond: number;
    durationMinutes: number;
    driverCommissionPercentage: number;
  } = {
    tier: 'silver',
    minGuests: 1,
    maxGuests: 4,
    basePricePerTour: 60,
    pricePerAdditionalGuestBeyond: 8,
    durationMinutes: 45,
    driverCommissionPercentage: 30
  };

  $: isDriver = $page.data.user?.role === 'driver';

  async function loadConfigs() {
    loading = true;
    error = '';

    const res = await fetch('/api/tour-pricing');
    const payload = await res.json();
    loading = false;

    if (!res.ok) {
      error = payload.error?.message ?? 'Failed to load pricing configurations';
      return;
    }

    configs = payload.data ?? [];
  }

  async function saveConfig() {
    error = '';

    if (editingId) {
      const res = await fetch(`/api/tour-pricing?id=${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const payload = await res.json();
      if (!res.ok) {
        error = payload.error?.message ?? 'Failed to update pricing';
        return;
      }
    } else {
      const res = await fetch('/api/tour-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const payload = await res.json();
      if (!res.ok) {
        error = payload.error?.message ?? 'Failed to create pricing';
        return;
      }
    }

    resetForm();
    await loadConfigs();
  }

  function editConfig(config: PricingConfig) {
    editingId = String(config.id);
    formData = {
      tier: config.tier,
      minGuests: config.minGuests,
      maxGuests: config.maxGuests,
      basePricePerTour: config.basePricePerTour,
      pricePerAdditionalGuestBeyond: config.pricePerAdditionalGuestBeyond,
      durationMinutes: config.durationMinutes,
      driverCommissionPercentage: config.driverCommissionPercentage
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    editingId = null;
    formData = {
      tier: 'silver',
      minGuests: 1,
      maxGuests: 4,
      basePricePerTour: 60,
      pricePerAdditionalGuestBeyond: 8,
      durationMinutes: 45,
      driverCommissionPercentage: 30
    };
  }

  async function deleteConfig(id: bigint) {
    if (!confirm('Delete this pricing configuration?')) return;

    error = '';
    const res = await fetch(`/api/tour-pricing?id=${id}`, { method: 'DELETE' });
    const payload = await res.json();

    if (!res.ok) {
      error = payload.error?.message ?? 'Failed to delete pricing';
      return;
    }

    await loadConfigs();
  }

  onMount(() => {
    void loadConfigs();
  });
</script>

{#if isDriver}
  <div class="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
    <p class="text-sm font-semibold text-red-800">Drivers cannot access this page.</p>
  </div>
{:else}
  <div class="max-w-5xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Tour Pricing Configuration</h1>

    {#if error}
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
        <p class="text-sm text-red-700">{error}</p>
      </div>
    {/if}

    <!-- Form -->
    <div class="rounded-xl border bg-white p-6 shadow-sm mb-6">
      <h2 class="text-xl font-semibold mb-4">{editingId ? 'Edit' : 'Add New'} Pricing Configuration</h2>

      <div class="grid md:grid-cols-3 gap-4 mb-4">
        <div>
          <label for="tier" class="block text-sm font-medium mb-1">Tour Tier</label>
          <select id="tier" bind:value={formData.tier} class="w-full border rounded-lg px-3 py-2">
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>

        <div>
          <label for="minGuests" class="block text-sm font-medium mb-1">Min Guests</label>
          <input id="minGuests" type="number" min="1" bind:value={formData.minGuests} class="w-full border rounded-lg px-3 py-2" />
        </div>

        <div>
          <label for="maxGuests" class="block text-sm font-medium mb-1">Max Guests</label>
          <input id="maxGuests" type="number" min="1" bind:value={formData.maxGuests} class="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-4">
        <div>
          <label for="basePrice" class="block text-sm font-medium mb-1">Base Price (€)</label>
          <input id="basePrice" type="number" step="0.01" min="0" bind:value={formData.basePricePerTour} class="w-full border rounded-lg px-3 py-2" />
        </div>

        <div>
          <label for="pricePerGuest" class="block text-sm font-medium mb-1">Price per Additional Guest (€)</label>
          <input id="pricePerGuest" type="number" step="0.01" min="0" bind:value={formData.pricePerAdditionalGuestBeyond} class="w-full border rounded-lg px-3 py-2" />
        </div>

        <div>
          <label for="duration" class="block text-sm font-medium mb-1">Duration (minutes)</label>
          <input id="duration" type="number" min="15" step="15" bind:value={formData.durationMinutes} class="w-full border rounded-lg px-3 py-2" />
        </div>
      </div>

      <div class="mb-4">
        <label for="commission" class="block text-sm font-medium mb-1">Driver Commission (%)</label>
        <input id="commission" type="number" step="0.01" min="0" max="100" bind:value={formData.driverCommissionPercentage} class="w-full border rounded-lg px-3 py-2" />
      </div>

      <div class="flex gap-2">
        <button
          class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
          on:click={saveConfig}
        >
          {editingId ? 'Update Configuration' : 'Add Configuration'}
        </button>
        {#if editingId}
          <button class="rounded-lg border px-4 py-2 font-semibold hover:bg-slate-50" on:click={resetForm}>
            Cancel
          </button>
        {/if}
      </div>
    </div>

    <!-- Configurations List -->
    <div class="rounded-xl border bg-white p-6 shadow-sm">
      <h2 class="text-xl font-semibold mb-4">Current Configurations</h2>

      {#if loading}
        <p class="text-slate-500">Loading...</p>
      {:else if configs.length === 0}
        <p class="text-slate-500">No pricing configurations yet. Create one above.</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b">
              <tr class="text-left">
                <th class="pb-3 font-semibold">Tier</th>
                <th class="pb-3 font-semibold">Guests</th>
                <th class="pb-3 font-semibold">Base Price</th>
                <th class="pb-3 font-semibold">Extra Guest</th>
                <th class="pb-3 font-semibold">Duration</th>
                <th class="pb-3 font-semibold">Commission</th>
                <th class="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              {#each configs as config (config.id)}
                <tr class="hover:bg-slate-50">
                  <td class="py-3 font-semibold text-blue-600 capitalize">{config.tier}</td>
                  <td class="py-3">{config.minGuests}-{config.maxGuests}</td>
                  <td class="py-3">€{config.basePricePerTour.toFixed(2)}</td>
                  <td class="py-3">€{config.pricePerAdditionalGuestBeyond.toFixed(2)}</td>
                  <td class="py-3">{config.durationMinutes} min</td>
                  <td class="py-3">{config.driverCommissionPercentage.toFixed(1)}%</td>
                  <td class="py-3 flex gap-2">
                    <button
                      class="text-blue-600 hover:underline text-xs font-semibold"
                      on:click={() => editConfig(config)}
                    >
                      Edit
                    </button>
                    <button
                      class="text-red-600 hover:underline text-xs font-semibold"
                      on:click={() => deleteConfig(config.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
{/if}
