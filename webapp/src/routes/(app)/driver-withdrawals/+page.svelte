<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { PageData } from './$types';

  export let data: PageData;

  let showWithdrawalModal = false;
  let withdrawalForm = {
    amount: '',
    bankName: '',
    bankAccount: '',
    notes: ''
  };
  let isSubmitting = false;
  let submitError = '';

  function formatCurrency(value: string): string {
    const num = parseFloat(value);
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
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

  function openWithdrawalModal() {
    withdrawalForm = { amount: '', bankName: '', bankAccount: '', notes: '' };
    submitError = '';
    showWithdrawalModal = true;
  }

  function closeWithdrawalModal() {
    showWithdrawalModal = false;
    submitError = '';
  }

  async function submitWithdrawalRequest() {
    submitError = '';
    const amount = parseFloat(withdrawalForm.amount);

    if (!withdrawalForm.amount || amount <= 0) {
      submitError = 'Please enter a valid amount';
      return;
    }

    if (amount > parseFloat(data.availableBalance)) {
      submitError = `Amount exceeds available balance (€${data.availableBalance})`;
      return;
    }

    isSubmitting = true;
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawalForm.amount,
          bankName: withdrawalForm.bankName || null,
          bankAccount: withdrawalForm.bankAccount || null,
          notes: withdrawalForm.notes || null
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Submission failed');
      }

      closeWithdrawalModal();
      window.location.reload();
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Failed to submit withdrawal request';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
  <div class="mx-auto max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Withdrawal Requests</h1>
      <p class="text-lg text-slate-600">Manage your earnings and withdrawal requests</p>
    </div>

    <!-- Balance Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border border-green-200">
        <p class="text-sm text-green-600 font-semibold mb-1">Total Earnings</p>
        <p class="text-4xl font-bold text-green-800">{formatCurrency(data.totalEarnings)}</p>
      </div>
      <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-6 border border-yellow-200">
        <p class="text-sm text-yellow-600 font-semibold mb-1">Pending/Processing</p>
        <p class="text-4xl font-bold text-yellow-800">{formatCurrency(data.pendingAmount)}</p>
      </div>
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
        <p class="text-sm text-blue-600 font-semibold mb-1">Available Balance</p>
        <p class="text-4xl font-bold text-blue-800">{formatCurrency(data.availableBalance)}</p>
      </div>
    </div>

    <!-- Request Withdrawal Button -->
    <div class="mb-8">
      <button
        on:click={openWithdrawalModal}
        disabled={parseFloat(data.availableBalance) <= 0}
        class="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold rounded-lg shadow-md transition-all"
      >
        + Request Withdrawal
      </button>
    </div>

    <!-- Withdrawal History -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <h2 class="text-xl font-bold text-slate-900">Withdrawal History</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Requested</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Completed</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody>
            {#if data.withdrawals.length === 0}
              <tr>
                <td colspan="5" class="px-6 py-12 text-center text-slate-500">No withdrawal requests yet</td>
              </tr>
            {:else}
              {#each data.withdrawals as withdrawal (withdrawal.id)}
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors" transition:fade>
                  <td class="px-6 py-4 font-bold text-lg text-slate-900">{formatCurrency(withdrawal.amount)}</td>
                  <td class="px-6 py-4">
                    <span class={getStatusBadgeClass(withdrawal.status)}>
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{formatDate(withdrawal.requestedAt)}</td>
                  <td class="px-6 py-4 text-sm text-slate-600">{formatDate(withdrawal.completedAt)}</td>
                  <td class="px-6 py-4 text-sm text-slate-600">
                    {#if withdrawal.rejectionReason}
                      <span class="text-red-600 font-semibold">Rejected: {withdrawal.rejectionReason}</span>
                    {:else if withdrawal.notes}
                      {withdrawal.notes}
                    {:else}
                      -
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Withdrawal Request Modal -->
{#if showWithdrawalModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" transition:fade>
      <h3 class="text-2xl font-bold text-slate-900 mb-4">Request Withdrawal</h3>

      <!-- Balance Info -->
      <div class="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
        <p class="text-sm text-blue-700">
          <span class="font-semibold">Available Balance:</span> {formatCurrency(data.availableBalance)}
        </p>
      </div>

      <!-- Form -->
      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Withdrawal Amount *</label>
          <div class="relative">
            <span class="absolute left-4 top-2 text-slate-600">€</span>
            <input
              type="number"
              bind:value={withdrawalForm.amount}
              placeholder="0.00"
              step="0.01"
              min="0"
              max={data.availableBalance}
              class="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Bank Name (Optional)</label>
          <input
            type="text"
            bind:value={withdrawalForm.bankName}
            placeholder="e.g., Erste Bank"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Bank Account (Optional)</label>
          <input
            type="text"
            bind:value={withdrawalForm.bankAccount}
            placeholder="IBAN or Account Number"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-900 mb-2">Notes (Optional)</label>
          <textarea
            bind:value={withdrawalForm.notes}
            placeholder="Any additional notes for the admin"
            rows="3"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- Error Message -->
      {#if submitError}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-700 text-sm font-semibold">{submitError}</p>
        </div>
      {/if}

      <!-- Info Box -->
      <div class="bg-slate-50 rounded-lg p-4 mb-6 text-sm text-slate-600">
        <p class="mb-2">
          <span class="font-semibold">Processing Time:</span> 1-3 business days after approval
        </p>
        <p>
          <span class="font-semibold">Minimum Amount:</span> €10
        </p>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-3">
        <button
          on:click={closeWithdrawalModal}
          disabled={isSubmitting}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          on:click={submitWithdrawalRequest}
          disabled={isSubmitting}
          class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style global>
  /* Tailwind classes are defined here implicitly */
</style>
