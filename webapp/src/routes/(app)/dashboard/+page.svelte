<script lang="ts">
  let question = 'Welche Fahrzeuge sind heute verfugbar?';
  let answer = '';
  let loading = false;

  async function askAi() {
    loading = true;
    answer = '';
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question })
      });
      const data = await res.json();
      answer = data.answer ?? 'Keine Antwort';
    } catch {
      answer = 'Fehler bei der AI-Anfrage';
    } finally {
      loading = false;
    }
  }
</script>

<div class="grid md:grid-cols-3 gap-4 mb-6">
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Today Revenue</p>
    <p class="text-2xl font-bold">EUR 0.00</p>
  </div>
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Open Bookings</p>
    <p class="text-2xl font-bold">0</p>
  </div>
  <div class="bg-white rounded-xl border p-4">
    <p class="text-xs uppercase text-slate-500">Active Drivers</p>
    <p class="text-2xl font-bold">0</p>
  </div>
</div>

<section class="bg-white rounded-xl border p-5">
  <h2 class="font-semibold text-lg mb-3">AI Assistant (FastAPI)</h2>
  <div class="flex flex-col gap-3">
    <textarea bind:value={question} class="w-full border rounded-lg px-3 py-2" rows="3"></textarea>
    <button class="self-start bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg" on:click={askAi} disabled={loading}>
      {loading ? 'Asking...' : 'Ask'}
    </button>
    {#if answer}
      <div class="rounded-lg bg-slate-50 border p-3 text-sm whitespace-pre-wrap">{answer}</div>
    {/if}
  </div>
</section>
