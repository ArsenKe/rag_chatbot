<script lang="ts">
  import { onMount } from 'svelte';

  export let data: { currentUserId: string | null };

  type AppUser = {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'driver';
    driverId: string | null;
    createdAt: string;
  };

  let users: AppUser[] = [];
  let loading = true;
  let saving = false;
  let inviting = false;
  let deletingId: string | null = null;
  let editingId: string | null = null;
  let errorMsg = '';

  let form: { email: string; role: AppUser['role'] } = {
    email: '',
    role: 'manager'
  };

  async function loadUsers() {
    loading = true;
    errorMsg = '';

    const res = await fetch('/api/users');
    const payload = await res.json();

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to load users';
      loading = false;
      return;
    }

    users = (payload.data ?? []).map((user: any) => ({
      ...user,
      id: String(user.id),
      driverId: user.driverId == null ? null : String(user.driverId)
    }));
    loading = false;
  }

  async function save() {
    saving = true;
    errorMsg = '';

    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim().toLowerCase(),
        role: form.role
      })
    });

    const payload = await res.json();
    saving = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to save user';
      return;
    }

    resetForm();
    await loadUsers();
  }

  async function inviteAndSave() {
    inviting = true;
    errorMsg = '';

    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim().toLowerCase(),
        role: form.role
      })
    });

    const payload = await res.json();
    inviting = false;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to send invite';
      return;
    }

    resetForm();
    await loadUsers();
  }

  function startEdit(user: AppUser) {
    editingId = user.id;
    form = {
      email: user.email,
      role: user.role
    };
  }

  function resetForm() {
    editingId = null;
    form = { email: '', role: 'manager' };
  }

  async function remove(user: AppUser) {
    if (!confirm(`Delete local access mapping for ${user.email}?`)) {
      return;
    }

    deletingId = user.id;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    const payload = await res.json();
    deletingId = null;

    if (!res.ok) {
      errorMsg = payload.error?.message ?? 'Failed to delete user';
      return;
    }

    if (editingId === user.id) {
      resetForm();
    }

    await loadUsers();
  }

  onMount(() => {
    void loadUsers();
  });
</script>

<div class="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
  <section class="bg-white rounded-xl border shadow-sm p-5 space-y-4">
    <div>
      <h2 class="text-xl font-semibold">{editingId ? 'Edit User Role' : 'Add User Role'}</h2>
      <p class="text-sm text-slate-500 mt-1">
        Supabase manages passwords and sessions. This screen maps email addresses to app roles.
      </p>
    </div>

    <div class="space-y-3">
      <input bind:value={form.email} class="w-full rounded-lg border px-3 py-2" placeholder="staff@royal-ecars.com" type="email" />
      <select bind:value={form.role} class="w-full rounded-lg border px-3 py-2">
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="driver">Driver</option>
      </select>
    </div>

    <div class="rounded-lg bg-slate-50 border p-3 text-sm text-slate-600">
      Create the identity in Supabase first, then add the same email here to grant app access.
    </div>

    {#if errorMsg}
      <p class="text-sm text-red-600">{errorMsg}</p>
    {/if}

    <div class="flex gap-2">
      <button
        class="flex-1 bg-brand hover:bg-brand-dark text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        on:click={save}
        disabled={saving}
      >{saving ? 'Saving…' : editingId ? 'Update mapping' : 'Create mapping'}</button>
      {#if !editingId}
        <button
          class="flex-1 bg-slate-900 hover:bg-black text-white rounded-lg py-2 font-semibold disabled:opacity-60"
          on:click={inviteAndSave}
          disabled={inviting}
        >{inviting ? 'Inviting…' : 'Invite + Create mapping'}</button>
      {/if}
      {#if editingId}
        <button class="px-4 rounded-lg border hover:bg-slate-50 text-sm" on:click={resetForm}>Cancel</button>
      {/if}
    </div>
  </section>

  <section class="space-y-3">
    <div class="flex items-end justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">Authorized App Users</h2>
        <p class="text-sm text-slate-500">Only admins can manage role mappings.</p>
      </div>
      <button class="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" on:click={loadUsers}>Refresh</button>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
      {#if loading}
        <p class="p-4 text-sm text-slate-500">Loading users…</p>
      {:else if users.length === 0}
        <div class="p-8 text-center">
          <p class="text-2xl mb-2">👤</p>
          <p class="text-sm text-slate-500">No local role mappings yet. The first Supabase login will create the first admin if the table is empty.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left">
              <tr>
                <th class="px-4 py-2 font-medium text-slate-600">Email</th>
                <th class="px-4 py-2 font-medium text-slate-600">Role</th>
                <th class="px-4 py-2 font-medium text-slate-600">Created</th>
                <th class="px-4 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each users as user (user.id)}
                <tr class="border-t hover:bg-slate-50 transition-colors {editingId === user.id ? 'bg-teal-50' : ''}">
                  <td class="px-4 py-2 font-medium">
                    {user.email}
                    {#if data.currentUserId === user.id}
                      <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">you</span>
                    {/if}
                  </td>
                  <td class="px-4 py-2">
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium {user.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : user.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">
                      {user.role}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td class="px-4 py-2">
                    <div class="flex gap-1">
                      <button
                        class="px-2 py-1 text-xs rounded border hover:bg-teal-50 hover:border-brand"
                        on:click={() => startEdit(user)}
                      >Edit</button>
                      <button
                        class="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={deletingId === user.id || data.currentUserId === user.id}
                        on:click={() => remove(user)}
                      >{deletingId === user.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </section>
</div>