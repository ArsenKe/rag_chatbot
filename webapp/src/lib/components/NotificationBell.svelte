<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Notification } from '$lib/types/notifications';

  interface NotificationResponse {
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }

  let unreadCount = 0;
  let showDropdown = false;
  let notifications: Notification[] = [];
  let loading = false;
  let error: string | null = null;

  /**
   * Load notifications from API
   */
  async function loadNotifications() {
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/notifications?take=10');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data: NotificationResponse = await response.json();
      notifications = data.notifications;
      unreadCount = data.unreadCount;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error loading notifications';
      console.error('Error loading notifications:', err);
    } finally {
      loading = false;
    }
  }

  /**
   * Mark single notification as read
   */
  async function markAsRead(notificationId: string, isRead: boolean) {
    if (isRead) return; // Already read

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      notifications = notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      unreadCount = Math.max(0, unreadCount - 1);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  /**
   * Mark all notifications as read
   */
  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications?action=mark-all-read', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Update local state
      notifications = notifications.map((n) => ({ ...n, isRead: true }));
      unreadCount = 0;
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }

  // Load notifications on mount and set up polling
  onMount(() => {
    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  });

  // Close dropdown when clicking outside
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-notification-bell]')) {
      showDropdown = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative" data-notification-bell>
  <!-- Bell Button -->
  <button
    class="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
    on:click={() => {
      showDropdown = !showDropdown;
      if (!showDropdown) loadNotifications();
    }}
    title="Notifications"
  >
    <svg
      class="w-6 h-6 text-slate-700"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>

    <!-- Unread Badge -->
    {#if unreadCount > 0}
      <span
        class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    {/if}
  </button>

  <!-- Dropdown Menu -->
  {#if showDropdown}
    <div
      class="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
      transition:fade
    >
      <!-- Header -->
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <h3 class="font-semibold text-slate-900">Notifications</h3>
        {#if unreadCount > 0}
          <button
            class="text-xs text-blue-600 hover:text-blue-800 font-medium"
            on:click={markAllAsRead}
          >
            Mark all as read
          </button>
        {/if}
      </div>

      <!-- Content -->
      <div class="max-h-96 overflow-y-auto">
        {#if loading}
          <div class="px-4 py-8 text-center text-slate-500">
            <div class="inline-block animate-spin">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>
        {:else if error}
          <div class="px-4 py-8 text-center text-red-600 text-sm">
            {error}
          </div>
        {:else if notifications.length === 0}
          <div class="px-4 py-8 text-center text-slate-500">
            <p class="text-sm">No notifications yet</p>
          </div>
        {:else}
          {#each notifications as notification (notification.id)}
            <div
              class="px-4 py-3 border-b hover:bg-slate-50 cursor-pointer transition-colors"
              class:bg-blue-50={!notification.isRead}
              on:click={() => markAsRead(notification.id, notification.isRead)}
            >
              <div class="flex items-start gap-3">
                <!-- Icon based on type -->
                <div class="flex-shrink-0 mt-1">
                  {#if notification.type === 'trip_assigned'}
                    <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 11-2 0 1 1 0 012 0zm0 8a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  {:else if notification.type === 'trip_completed'}
                    <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else if notification.type === 'payment_received'}
                    <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  {:else if notification.type === 'trip_cancelled'}
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.5 3A1.5 1.5 0 001 4.5v.006c0 .896.672 1.477 2.5 2.5 1.989 1.237 5.336 3.132 5.336 5.994v5c0 .896.672 1.477 2.5 2.5 1.989 1.237 5.336 3.132 5.336 5.994V19h2v-.006c0-.896-.672-1.477-2.5-2.5-1.989-1.237-5.336-3.132-5.336-5.994v-5c0-.896-.672-1.477-2.5-2.5C3.172 4.985 2.5 4.404 2.5 3.508V3.5A1.5 1.5 0 002.5 3z" />
                    </svg>
                  {/if}
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-slate-900 text-sm">{notification.title}</p>
                  <p class="text-slate-600 text-sm mt-1">{notification.message}</p>
                  <p class="text-xs text-slate-400 mt-2">
                    {new Date(notification.createdAt).toLocaleDateString()}{' '}
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <!-- Unread Indicator -->
                {#if !notification.isRead}
                  <div class="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      {#if notifications.length > 0}
        <div class="px-4 py-3 border-t text-center">
          <a href="/notifications" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all notifications
          </a>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global([data-notification-bell]) :global(svg) {
    will-change: transform;
  }
</style>
