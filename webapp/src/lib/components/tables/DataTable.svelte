<script lang="ts">
  export let title = 'Data Table';
  export let rows: Array<Record<string, unknown>> = [];
</script>

<section class="bg-white rounded-xl border shadow-sm overflow-hidden">
  <div class="px-4 py-3 border-b">
    <h2 class="font-semibold">{title}</h2>
  </div>

  <div class="overflow-x-auto">
    {#if rows.length === 0}
      <p class="p-4 text-sm text-slate-500">No data yet.</p>
    {:else}
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left">
          <tr>
            {#each Object.keys(rows[0]) as col}
              <th class="px-4 py-2 font-medium text-slate-600">{col}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr class="border-t">
              {#each Object.values(row) as cell}
                <td class="px-4 py-2">{String(cell ?? '')}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>
