<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let selectedStatus = data.filters.status;
  let showApprovalModal = false;
  let showRejectModal = false;
  let selectedWithdrawal: any = null;
  let rejectionReason = '';
  let processingWithdrawalId: string | null = null;

  const statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Processing', value: 'processing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' }
  ];

  function getStatusBadgeClass(status: string): string {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'pending':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'processing':
        return `${baseClass} bg-purple-100 text-purple-800`;
      case 'completed':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'cancelled':
        return `${baseClass} bg-slate-100 text-slate-800`;
      default:
        return `${baseClass} bg-slate-100 text-slate-800`;
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function handleStatusFilter(status: string) {
    selectedStatus = status;
    const url = new URL(window.location.href);
    url.searchParams.set('status', status);
    url.searchParams.delete('skip');
    window.location.href = url.toString();
  }

  function openApprovalModal(withdrawal: any) {
    selectedWithdrawal = withdrawal;
    showApprovalModal = true;
  }

  function openRejectModal(withdrawal: any) {
    selectedWithdrawal = withdrawal;
    rejectionReason = '';
    showRejectModal = true;
  }

  function closeModals() {
    showApprovalModal = false;
    showRejectModal = false;
    selectedWithdrawal = null;
    rejectionReason = '';
  }

  async function approveWithdrawal() {
    if (!selectedWithdrawal) return;

    processingWithdrawalId = selectedWithdrawal.id;
    try {
      const response = await fetch(`/api/withdrawals/${selectedWithdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (!response.ok) throw new Error('Approval failed');
      closeModals();
      window.location.reload();
    } catch (err) {
      alert(`Approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      processingWithdrawalId = null;
    }
  }

  async function rejectWithdrawal() {
    if (!selectedWithdrawal) return;

    processingWithdrawalId = selectedWithdrawal.id;
    try {
      const response = await fetch(`/api/withdrawals/${selectedWithdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason })
      });

      if (!response.ok) throw new Error('Rejection failed');
      closeModals();
      window.location.reload();
    } catch (err) {
      alert(`Rejection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      processingWithdrawalId = null;
    }
  }

  async function processWithdrawal(withdrawal: any) {
    processingWithdrawalId = withdrawal.id;
    try {
      const response = await fetch(`/api/withdrawals/${withdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      });

      if (!response.ok) throw new Error('Processing failed');
      window.location.reload();
    } catch (err) {
      alert(`Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      processingWithdrawalId = null;
    }
  }

  async function completeWithdrawal(withdrawal: any) {
    processingWithdrawalId = withdrawal.id;
    try {
      const response = await fetch(`/api/withdrawals/${withdrawal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });

      if (!response.ok) throw new Error('Completion failed');
      window.location.reload();
    } catch (err) {
      alert(`Completion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      processingWithdrawalId = null;
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
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Withdrawal Management</h1>
      <p class="text-lg text-slate-600">Manage driver withdrawal requests and payouts</p>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div class="bg-white rounded-lg shadow-md p-4">
        <p class="text-sm text-slate-600 font-semibold">Total Requests</p>
        <p class="text-3xl font-bold text-slate-900">{data.summary.total}</p>
      </div>
      <div class="bg-yellow-50 rounded-lg shadow-md p-4">
        <p class="text-sm text-yellow-600 font-semibold">Pending</p>
        <p class="text-3xl font-bold text-yellow-700">{data.summary.pending}</p>
      </div>
      <div class="bg-blue-50 rounded-lg shadow-md p-4">
        <p class="text-sm text-blue-600 font-semibold">Approved</p>
        <p class="text-3xl font-bold text-blue-700">{data.summary.approved}</p>
      </div>
      <div class="bg-purple-50 rounded-lg shadow-md p-4">
        <p class="text-sm text-purple-600 font-semibold">Processing</p>
        <p class="text-3xl font-bold text-purple-700">{data.summary.processing}</p>
      </div>
      <div class="bg-green-50 rounded-lg shadow-md p-4">
        <p class="text-sm text-green-600 font-semibold">Total Amount</p>
        <p class="text-2xl font-bold text-green-700">€{data.totalAmount}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1">
          <label class="block text-sm font-semibold text-slate-900 mb-2">Filter by Status</label>
          <select
            value={selectedStatus}
            on:change={(e) => handleStatusFilter(e.currentTarget.value)}
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Withdrawals Table -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Driver</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Requested</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if data.withdrawals.length === 0}
              <tr>
                <td colspan="5" class="px-6 py-12 text-center text-slate-500">No withdrawals found</td>
              </tr>
            {:else}
              {#each data.withdrawals as withdrawal (withdrawal.id)}
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                  <td class="px-6 py-4">
                    <div>
                      <p class="font-medium text-slate-900">{withdrawal.driverName}</p>
                      <p class="text-sm text-slate-600">{withdrawal.driverPhone}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-semibold text-slate-900">€{withdrawal.amount}</td>
                  <td class="px-6 py-4">
                    <span class={getStatusBadgeClass(withdrawal.status)}>
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{formatDate(withdrawal.requestedAt)}</td>
                  <td class="px-6 py-4">
                    <div class="flex gap-2">
                      {#if withdrawal.status === 'pending'}
                        <button
                          on:click={() => openApprovalModal(withdrawal)}
                          disabled={processingWithdrawalId === withdrawal.id}
                          class="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs rounded font-medium transition-colors disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          on:click={() => openRejectModal(withdrawal)}
                          disabled={processingWithdrawalId === withdrawal.id}
                          class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded font-medium transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      {/if}
                      {#if withdrawal.status === 'approved'}
                        <button
                          on:click={() => processWithdrawal(withdrawal)}
                          disabled={processingWithdrawalId === withdrawal.id}
                          class="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded font-medium transition-colors disabled:opacity-50"
                        >
                          ⚙️ Process
                        </button>
                      {/if}
                      {#if withdrawal.status === 'processing'}
                        <button
                          on:click={() => completeWithdrawal(withdrawal)}
                          disabled={processingWithdrawalId === withdrawal.id}
                          class="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs rounded font-medium transition-colors disabled:opacity-50"
                        >
                          ✓ Complete
                        </button>
                      {/if}
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
          Showing {data.pagination.skip + 1} - {Math.min(data.pagination.skip + data.pagination.take, data.pagination.total)} of {data.pagination.total} withdrawals
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

<!-- Approval Confirmation Modal -->
{#if showApprovalModal && selectedWithdrawal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" transition:fade>
      <h3 class="text-2xl font-bold text-slate-900 mb-4">Approve Withdrawal</h3>
      <div class="bg-slate-50 rounded p-4 mb-6">
        <p class="text-sm text-slate-600">Driver: <span class="font-semibold">{selectedWithdrawal.driverName}</span></p>
        <p class="text-sm text-slate-600">Amount: <span class="font-bold text-lg">€{selectedWithdrawal.amount}</span></p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          on:click={() => closeModals()}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={approveWithdrawal}
          disabled={processingWithdrawalId !== null}
          class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {processingWithdrawalId === selectedWithdrawal.id ? 'Processing...' : 'Approve Withdrawal'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Rejection Modal -->
{#if showRejectModal && selectedWithdrawal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" transition:fade>
      <h3 class="text-2xl font-bold text-slate-900 mb-4">Reject Withdrawal</h3>
      <div class="bg-slate-50 rounded p-4 mb-6">
        <p class="text-sm text-slate-600">Driver: <span class="font-semibold">{selectedWithdrawal.driverName}</span></p>
        <p class="text-sm text-slate-600">Amount: <span class="font-bold text-lg">€{selectedWithdrawal.amount}</span></p>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-slate-900 mb-2">Rejection Reason</label>
        <textarea
          bind:value={rejectionReason}
          placeholder="Why is this withdrawal being rejected?"
          class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows="4"
        />
      </div>

      <div class="flex justify-end gap-3">
        <button
          on:click={() => closeModals()}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={rejectWithdrawal}
          disabled={processingWithdrawalId !== null}
          class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {processingWithdrawalId === selectedWithdrawal.id ? 'Processing...' : 'Reject Withdrawal'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
