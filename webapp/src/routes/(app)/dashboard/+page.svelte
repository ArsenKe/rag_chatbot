<script lang="ts">
  export let data;

  let question = 'Welche Fahrzeuge sind heute verfugbar?';
  let answer = '';
  let loading = false;
  let errorMsg = '';

  async function askAi() {
    loading = true;
    answer = '';
    errorMsg = '';

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question })
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error?.message ?? 'Fehler bei der AI-Anfrage';
        return;
      }

      answer = data.answer ?? 'Keine Antwort';
    } catch {
      errorMsg = 'Fehler bei der AI-Anfrage';
    } finally {
      loading = false;
    }
  }
</script>

<div class="grid md:grid-cols-3 gap-4 mb-6">
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Today Revenue</p>
    <p class="text-2xl font-bold">EUR {data.metrics.todayRevenue.toFixed(2)}</p>
  </div>
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Open Bookings</p>
    <p class="text-2xl font-bold">{data.metrics.openBookings}</p>
  </div>
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Active Drivers</p>
    <p class="text-2xl font-bold">{data.metrics.activeDrivers}</p>
  </div>
</div>

<section class="bg-white rounded-xl border p-5 mb-6">
  <h2 class="font-semibold text-lg mb-3">Recent Bookings</h2>
  {#if data.recentBookings.length === 0}
    <p class="text-sm text-slate-500">No bookings yet.</p>
  {:else}
    <div class="space-y-3">
      {#each data.recentBookings as booking}
        <div class="rounded-lg border bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-medium">#{booking.id} · {booking.customer}</p>
            <p class="text-sm text-slate-600">{booking.pickup} → {booking.dropoff}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-slate-600">{new Date(booking.start).toLocaleString()}</p>
            <p class="text-sm font-medium capitalize">{booking.status}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<section class="bg-white rounded-xl border p-5">
  <h2 class="font-semibold text-lg mb-3">AI Assistant (FastAPI)</h2>
  <div class="flex flex-col gap-3">
    <textarea bind:value={question} class="w-full border rounded-lg px-3 py-2" rows="3"></textarea>
    <button class="self-start bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg" on:click={askAi} disabled={loading}>
      {loading ? 'Asking...' : 'Ask'}
    </button>
    {#if errorMsg}
      <div class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{errorMsg}</div>
    {/if}
    {#if answer}
      <div class="rounded-lg bg-slate-50 border p-3 text-sm whitespace-pre-wrap">{answer}</div>
    {/if}
  </div>
</section>
