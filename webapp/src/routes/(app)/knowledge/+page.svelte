<script lang="ts">
  import { onMount } from 'svelte';

  let totalDocuments: number | null = null;
  let loadingStats = true;
  let uploading = false;
  let scrapingUrls = false;
  let importingGDrive = false;
  let seeding = false;
  let clearing = false;
  let forceSeed = true;
  let selectedFile: File | null = null;
  let urlsText = '';
  let gdriveFolderId = '';
  let statusMsg = '';
  let errorMsg = '';

  async function loadStats() {
    loadingStats = true;
    errorMsg = '';

    const res = await fetch('/api/knowledge/stats');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load knowledge stats';
      loadingStats = false;
      return;
    }

    totalDocuments = Number(payload.data?.total_documents ?? 0);
    loadingStats = false;
  }

  function onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    selectedFile = input.files?.[0] ?? null;
  }

  async function uploadFile() {
    if (!selectedFile) {
      errorMsg = 'Please select a file first.';
      return;
    }

    uploading = true;
    errorMsg = '';
    statusMsg = '';

    const form = new FormData();
    form.append('file', selectedFile, selectedFile.name);

    const res = await fetch('/api/knowledge/upload', {
      method: 'POST',
      body: form
    });

    const payload = await res.json();
    uploading = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Upload failed';
      return;
    }

    const added = payload.data?.chunks_added;
    statusMsg = added
      ? `Uploaded ${selectedFile.name}. Added ${added} chunks.`
      : `Uploaded ${selectedFile.name}.`;

    selectedFile = null;
    await loadStats();
  }

  async function seedSample() {
    seeding = true;
    errorMsg = '';
    statusMsg = '';

    const res = await fetch('/api/knowledge/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: forceSeed })
    });

    const payload = await res.json();
    seeding = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Seed request failed';
      return;
    }

    const after = payload.data?.documents_after;
    statusMsg = `Seed completed${after !== undefined ? `. Documents: ${after}` : ''}.`;
    await loadStats();
  }

  async function clearKnowledge() {
    const confirmed = window.confirm('Clear all indexed chunks? This cannot be undone.');
    if (!confirmed) return;

    clearing = true;
    errorMsg = '';
    statusMsg = '';

    const res = await fetch('/api/knowledge/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });

    const payload = await res.json();
    clearing = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Clear request failed';
      return;
    }

    const before = payload.data?.documents_before;
    statusMsg = `Knowledge base cleared${before !== undefined ? ` (removed ${before} chunks)` : ''}.`;
    await loadStats();
  }

  async function scrapeUrls() {
    const urls = urlsText
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (!urls.length) {
      errorMsg = 'Please add at least one URL.';
      return;
    }

    scrapingUrls = true;
    errorMsg = '';
    statusMsg = '';

    const res = await fetch('/api/knowledge/scrape-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls })
    });

    const payload = await res.json();
    scrapingUrls = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'URL scrape failed';
      return;
    }

    const count = payload.data?.documents;
    statusMsg = `Scrape completed${count !== undefined ? ` for ${count} documents` : ''}.`;
    await loadStats();
  }

  async function importGDrive() {
    const folderId = gdriveFolderId.trim();
    if (!folderId) {
      errorMsg = 'Please provide a Google Drive folder ID.';
      return;
    }

    importingGDrive = true;
    errorMsg = '';
    statusMsg = '';

    const res = await fetch('/api/knowledge/scrape-gdrive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId })
    });

    const payload = await res.json();
    importingGDrive = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Google Drive import failed';
      return;
    }

    const count = payload.data?.documents;
    statusMsg = `Google Drive import completed${count !== undefined ? ` for ${count} documents` : ''}.`;
    await loadStats();
  }

  onMount(() => {
    void loadStats();
  });
</script>

<div class="space-y-6">
  <section class="bg-white rounded-xl border shadow-sm p-5">
    <h2 class="text-xl font-semibold">Knowledge Base Admin</h2>
    <p class="text-sm text-slate-500 mt-1">
      Manage RAG backend content without leaving the operations app.
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-lg border bg-slate-50 p-4">
        <p class="text-xs uppercase tracking-wide text-slate-500">Indexed chunks</p>
        {#if loadingStats}
          <p class="mt-2 text-slate-600">Loading…</p>
        {:else}
          <p class="mt-2 text-2xl font-semibold">{totalDocuments ?? 0}</p>
        {/if}
      </div>

      <div class="rounded-lg border bg-rose-50 p-4">
        <p class="text-xs uppercase tracking-wide text-rose-700">Danger Zone</p>
        <p class="mt-2 text-sm text-rose-800">Delete all indexed chunks from the RAG store.</p>
        <button
          class="mt-3 rounded-lg bg-rose-700 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          on:click={clearKnowledge}
          disabled={clearing || loadingStats}
        >{clearing ? 'Clearing…' : 'Clear knowledge base'}</button>
      </div>
    </div>

    {#if errorMsg}
      <p class="mt-4 text-sm text-red-600">{errorMsg}</p>
    {/if}
    {#if statusMsg}
      <p class="mt-4 text-sm text-emerald-700">{statusMsg}</p>
    {/if}
  </section>

  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-3">
    <h3 class="text-lg font-semibold">Upload Document</h3>
    <p class="text-sm text-slate-500">Upload text-like files to index new knowledge chunks.</p>

    <input type="file" on:change={onFilePicked} class="block w-full text-sm" />
    {#if selectedFile}
      <p class="text-sm text-slate-600">Selected: {selectedFile.name}</p>
    {/if}

    <div class="flex gap-2">
      <button
        class="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        on:click={uploadFile}
        disabled={!selectedFile || uploading}
      >{uploading ? 'Uploading…' : 'Upload to RAG'}</button>

      <button class="rounded-lg border px-4 py-2 text-sm" on:click={loadStats}>Refresh stats</button>
    </div>
  </section>

  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-3">
    <h3 class="text-lg font-semibold">Scrape URLs</h3>
    <p class="text-sm text-slate-500">Add one URL per line. The backend will scrape and index them.</p>

    <textarea
      bind:value={urlsText}
      rows="5"
      class="w-full rounded-lg border px-3 py-2 text-sm"
      placeholder="https://example.com/page-1&#10;https://example.com/page-2"
    ></textarea>

    <div>
      <button
        class="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        on:click={scrapeUrls}
        disabled={scrapingUrls}
      >{scrapingUrls ? 'Scraping…' : 'Scrape and index URLs'}</button>
    </div>
  </section>

  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-3">
    <h3 class="text-lg font-semibold">Import from Google Drive</h3>
    <p class="text-sm text-slate-500">Provide a Drive folder ID to import and index documents.</p>

    <input
      bind:value={gdriveFolderId}
      class="w-full rounded-lg border px-3 py-2 text-sm"
      placeholder="Google Drive folder ID"
    />

    <div>
      <button
        class="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        on:click={importGDrive}
        disabled={importingGDrive}
      >{importingGDrive ? 'Importing…' : 'Import from Google Drive'}</button>
    </div>
  </section>

  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-3">
    <h3 class="text-lg font-semibold">Seed Sample Knowledge</h3>
    <p class="text-sm text-slate-500">
      Trigger backend sample seeding. Keep force enabled to fully rebuild sample chunks.
    </p>

    <label class="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" bind:checked={forceSeed} />
      Force rebuild
    </label>

    <div>
      <button
        class="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        on:click={seedSample}
        disabled={seeding}
      >{seeding ? 'Seeding…' : 'Seed sample data'}</button>
    </div>
  </section>
</div>
