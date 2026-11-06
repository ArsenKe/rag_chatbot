<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let searchInput = '';
  let selectedRole = data.filters.role;
  let showEditModal = false;
  let showLinkModal = false;
  let selectedUser: any = null;
  let editData = { role: '' };
  let linkData = { profileType: '', profileId: '' };

  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    { label: 'Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
    { label: 'Driver', value: 'driver' }
  ];

  function handleSearch() {
    const url = new URL(window.location.href);
    url.searchParams.set('search', searchInput);
    url.searchParams.delete('skip');
    window.location.href = url.toString();
  }

  function handleRoleFilter(role: string) {
    selectedRole = role;
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    url.searchParams.delete('skip');
    window.location.href = url.toString();
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function getRoleBadgeClass(role: string): string {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (role) {
      case 'admin':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'manager':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'driver':
        return `${baseClass} bg-purple-100 text-purple-800`;
      default:
        return `${baseClass} bg-slate-100 text-slate-800`;
    }
  }

  function openEditModal(user: any) {
    selectedUser = user;
    editData = { role: user.role };
    showEditModal = true;
  }

  function openLinkModal(user: any) {
    selectedUser = user;
    linkData = { profileType: '', profileId: '' };
    showLinkModal = true;
  }

  function closeModals() {
    showEditModal = false;
    showLinkModal = false;
    selectedUser = null;
  }

  async function updateUserRole() {
    if (!selectedUser || !editData.role) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editData.role })
      });

      if (!response.ok) throw new Error('Update failed');
      closeModals();
      window.location.reload();
    } catch (err) {
      alert(`Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function linkUserProfile() {
    if (!selectedUser || !linkData.profileType || !linkData.profileId) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileType: linkData.profileType,
          profileId: linkData.profileId
        })
      });

      if (!response.ok) throw new Error('Link failed');
      closeModals();
      window.location.reload();
    } catch (err) {
      alert(`Link failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');
      window.location.reload();
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  function handlePageChange(newSkip: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('skip', newSkip.toString());
    window.location.href = url.toString();
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">User Management</h1>
      <p class="text-lg text-slate-600">Manage users, assign roles, and link profiles</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Search -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Search by Email</label>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={searchInput}
              placeholder="user@example.com"
              class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              on:click={handleSearch}
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        <!-- Role Filter -->
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Filter by Role</label>
          <select
            value={selectedRole}
            on:change={(e) => handleRoleFilter(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {#each roleOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <!-- Stats -->
        <div>
          <p class="text-sm font-semibold text-slate-900 mb-2">Total Users</p>
          <p class="text-3xl font-bold text-blue-600">{data.pagination.total}</p>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Linked Profile</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if data.users.length === 0}
              <tr>
                <td colspan="5" class="px-6 py-12 text-center text-slate-500">No users found</td>
              </tr>
            {:else}
              {#each data.users as user (user.id)}
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                  <td class="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                  <td class="px-6 py-4">
                    <span class={getRoleBadgeClass(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-slate-600">
                    {#if user.linkedProfile === 'Driver'}
                      <span class="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-medium">
                        🚗 {user.driverName}
                      </span>
                    {:else if user.linkedProfile === 'Customer'}
                      <span class="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                        👤 {user.customerName}
                      </span>
                    {:else}
                      <span class="text-slate-500 italic">Not linked</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                  <td class="px-6 py-4 text-center">
                    <div class="flex justify-center gap-2">
                      <button
                        on:click={() => openEditModal(user)}
                        class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded font-medium transition-colors"
                      >
                        ⚙️ Edit Role
                      </button>
                      <button
                        on:click={() => openLinkModal(user)}
                        class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded font-medium transition-colors"
                      >
                        🔗 Link Profile
                      </button>
                      <button
                        on:click={() => deleteUser(user.id)}
                        class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded font-medium transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <p class="text-slate-600">
          Showing {data.pagination.skip + 1} - {Math.min(data.pagination.skip + data.pagination.take, data.pagination.total)} of {data.pagination.total} users
        </p>
        <div class="flex gap-2">
          <button
            on:click={() => handlePageChange(Math.max(0, data.pagination.skip - data.pagination.take))}
            disabled={data.pagination.skip === 0}
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-900 rounded-lg font-medium transition-colors"
          >
            ← Previous
          </button>
          <button
            on:click={() => handlePageChange(data.pagination.skip + data.pagination.take)}
            disabled={!data.pagination.hasMore}
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-900 rounded-lg font-medium transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Edit Role Modal -->
{#if showEditModal && selectedUser}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" transition:fade>
      <h3 class="text-2xl font-bold text-slate-900 mb-4">Edit User Role</h3>
      <p class="text-slate-600 mb-6">{selectedUser.email}</p>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-slate-900 mb-2">Select Role</label>
        <select
          bind:value={editData.role}
          class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      <div class="flex justify-end gap-3">
        <button
          on:click={() => closeModals()}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={updateUserRole}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Update Role
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Link Profile Modal -->
{#if showLinkModal && selectedUser}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" transition:fade>
      <h3 class="text-2xl font-bold text-slate-900 mb-4">Link Profile</h3>
      <p class="text-slate-600 mb-6">{selectedUser.email}</p>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-slate-900 mb-2">Profile Type</label>
        <select
          bind:value={linkData.profileType}
          class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select profile type...</option>
          <option value="driver">Driver</option>
          <option value="customer">Customer</option>
        </select>
      </div>

      {#if linkData.profileType === 'driver'}
        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-900 mb-2">Select Driver</label>
          <select
            bind:value={linkData.profileId}
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-48 overflow-y-auto"
          >
            <option value="">Choose a driver...</option>
            {#each data.linkedProfileOptions.availableDrivers as driver}
              <option value={driver.id}>
                {driver.name} ({driver.license})
              </option>
            {/each}
          </select>
        </div>
      {:else if linkData.profileType === 'customer'}
        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-900 mb-2">Select Customer</label>
          <select
            bind:value={linkData.profileId}
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-48 overflow-y-auto"
          >
            <option value="">Choose a customer...</option>
            {#each data.linkedProfileOptions.availableCustomers as customer}
              <option value={customer.id}>
                {customer.name} ({customer.email})
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="flex justify-end gap-3">
        <button
          on:click={() => closeModals()}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={linkUserProfile}
          disabled={!linkData.profileType || !linkData.profileId}
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          Link Profile
        </button>
      </div>
    </div>
  </div>
{/if}

<style global>
  /* Tailwind classes are defined here implicitly */
</style>