<script lang="ts">
  export let data;

  // ── AI Chat ─────────────────────────────────────────────────────────────────
  type Source = { title: string; url: string | null };
  type Message = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    sources?: Source[];
    error?: boolean;
    loading?: boolean;
    failedText?: string;
  };

  let messages: Message[] = [];
  let inputText = '';
  let nextId = 1;
  let chatEl: HTMLDivElement;

  const PROMPTS: Record<string, string[]> = {
    admin: [
      'What luxury vehicles are in the fleet?',
      'What booking options are available?',
      'What premium services does Royal E-Cars offer?',
      'What are the operation hours?'
    ],
    manager: [
      'What are the pricing details for city tours?',
      'How does the airport transfer service work?',
      'What premium services are offered?',
      'What is the contact email for bookings?'
    ],
    driver: [
      'What premium services should I know about?',
      'What are the operation hours?',
      'What vehicles are in the fleet?',
      'What is the contact for bookings?'
    ]
  };

  const role = data.user?.role ?? 'admin';
  const suggestedPrompts: string[] = PROMPTS[role] ?? PROMPTS.admin;

  function scrollToBottom() {
    setTimeout(() => {
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 50);
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { id: nextId++, role: 'user', text: text.trim() };
    const loadingId = nextId++;
    messages = [...messages, userMsg, { id: loadingId, role: 'assistant', text: '', loading: true }];
    inputText = '';
    scrollToBottom();
    await doRequest(text.trim(), loadingId);
  }

  async function doRequest(text: string, targetId: number) {
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const payload = await res.json();
      if (!res.ok) {
        const errMsg = payload?.error?.message ?? 'Request failed. Please try again.';
        messages = messages.map((m) =>
          m.id === targetId ? { ...m, loading: false, error: true, text: errMsg, failedText: text } : m
        );
      } else {
        const answer =
          payload.answer?.trim()
            ? payload.answer
            : "I couldn't find an answer in our knowledge base. Please contact support.";
        messages = messages.map((m) =>
          m.id === targetId ? { ...m, loading: false, text: answer, sources: payload.sources ?? [] } : m
        );
      }
    } catch {
      messages = messages.map((m) =>
        m.id === targetId
          ? { ...m, loading: false, error: true, text: 'Network error. Please check your connection.', failedText: text }
          : m
      );
    }
    scrollToBottom();
  }

  async function retry(failedText: string, targetId: number) {
    messages = messages.map((m) =>
      m.id === targetId ? { ...m, loading: true, error: false, text: '', failedText: undefined } : m
    );
    await doRequest(failedText, targetId);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
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
  <div class="flex items-baseline justify-between mb-4">
    <h2 class="font-semibold text-lg">AI Assistant</h2>
    <span class="text-xs text-slate-400">Royal E-Cars knowledge base</span>
  </div>

  <!-- Chat history -->
  <div
    bind:this={chatEl}
    class="flex flex-col gap-3 overflow-y-auto max-h-96 mb-4"
    aria-live="polite"
    aria-label="Chat history"
  >
    {#if messages.length === 0}
      <div class="py-6">
        <p class="text-xs text-slate-400 mb-3 text-center font-medium uppercase tracking-wide">Suggested prompts</p>
        <div class="flex flex-wrap gap-2 justify-center">
          {#each suggestedPrompts as prompt}
            <button
              class="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-brand hover:text-brand transition-colors"
              on:click={() => sendMessage(prompt)}
            >{prompt}</button>
          {/each}
        </div>
      </div>
    {:else}
      {#each messages as msg (msg.id)}
        {#if msg.role === 'user'}
          <div class="flex justify-end">
            <div class="rounded-2xl rounded-tr-sm bg-brand text-white px-4 py-2.5 text-sm max-w-[80%] shadow-sm">
              {msg.text}
            </div>
          </div>
        {:else if msg.loading}
          <div class="flex items-start gap-2">
            <div class="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-brand">AI</div>
            <div class="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
              <span class="flex gap-1 items-center">
                <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
              </span>
            </div>
          </div>
        {:else if msg.error}
          <div class="flex items-start gap-2">
            <div class="w-7 h-7 rounded-full bg-red-100 border border-red-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-red-600">AI</div>
            <div class="rounded-2xl rounded-tl-sm bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 max-w-[80%]">
              <p>{msg.text}</p>
              {#if msg.failedText}
                <button
                  class="mt-1.5 text-xs font-medium underline hover:text-red-900"
                  on:click={() => retry(msg.failedText || '', msg.id)}
                >Retry</button>
              {/if}
            </div>
          </div>
        {:else}
          <div class="flex items-start gap-2">
            <div class="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-brand">AI</div>
            <div class="max-w-[80%]">
              <div class="rounded-2xl rounded-tl-sm bg-slate-50 border px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">{msg.text}</div>
              {#if msg.sources && msg.sources.length > 0}
                <div class="mt-1.5 flex flex-wrap gap-1.5 pl-1">
                  {#each msg.sources as src}
                    {#if src.url}
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5 hover:border-brand transition-colors"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m3.654-3.654a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.101-1.102"/></svg>
                        {src.title}
                      </a>
                    {:else}
                      <span class="inline-flex items-center text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">{src.title}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Input -->
  <div class="flex gap-2 border-t pt-4">
    <textarea
      bind:value={inputText}
      on:keydown={handleKeydown}
      placeholder="Ask anything about Royal E-Cars… (Enter to send)"
      rows="2"
      class="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-brand"
    ></textarea>
    <button
      class="self-end bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      on:click={() => sendMessage(inputText)}
      disabled={!inputText.trim() || messages.some((m) => m.loading)}
    >Send</button>
  </div>
</section>
