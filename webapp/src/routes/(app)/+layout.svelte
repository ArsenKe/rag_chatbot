<script lang="ts">
  import { NAV_BY_ROLE } from '$lib/rbac/policy';

  export let data;

  const roleTitle: Record<string, string> = {
    admin: 'Admin Console',
    manager: 'Manager Console',
    driver: 'Driver Analytics'
  };

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-100 to-white">
  <header class="border-b bg-white sticky top-0 z-20">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div>
        <h1 class="font-bold text-lg">Royal E-Cars {roleTitle[data.user?.role] ?? 'Operations'}</h1>
        <p class="text-xs text-slate-500">{data.user?.email} · {data.user?.role}</p>
      </div>
      <nav class="flex gap-3 text-sm items-center flex-wrap justify-end">
        {#each NAV_BY_ROLE[data.user?.role] ?? NAV_BY_ROLE.manager as item}
          <a class="hover:text-brand" href={item.href}>{item.label}</a>
        {/each}
        <button class="rounded-lg border px-3 py-1.5 hover:border-brand hover:text-brand" on:click={logout}>Sign out</button>
      </nav>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6">
    <slot />
  </main>
</div>
