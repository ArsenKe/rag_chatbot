<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;

  const totalPages = Math.ceil(data.total / data.pageSize);

  async function markAsRead(notificationId: string, isRead: boolean) {
    if (isRead) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch('/api/notifications?action=mark-all-read', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'trip_assigned':
        return '📍';
      case 'trip_started':
        return '🚗';
      case 'trip_completed':
        return '✅';
      case 'trip_cancelled':
        return '❌';
      case 'payment_received':
        return '💰';
      case 'tour_started':
        return '🎫';
      case 'tour_completed':
        return '🎉';
      case 'review_received':
        return '⭐';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'trip_assigned':
        return 'bg-blue-50 border-l-blue-500';
      case 'trip_completed':
        return 'bg-green-50 border-l-green-500';
      case 'payment_received':
        return 'bg-emerald-50 border-l-emerald-500';
      case 'trip_cancelled':
        return 'bg-red-50 border-l-red-500';
      case 'tour_started':
      case 'tour_completed':
        return 'bg-purple-50 border-l-purple-500';
      case 'review_received':
        return 'bg-yellow-50 border-l-yellow-500';
      default:
        return 'bg-slate-50 border-l-slate-500';
    }
  };
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-slate-900 mb-2">Notifications</h1>
    <div class="flex items-center justify-between">
      <p class="text-slate-600">
        {data.total} total · {data.unreadCount} unread
      </p>
      {#if data.unreadCount > 0}
        <button
          class="text-sm text-blue-600 hover:text-blue-800 font-medium"
          on:click={markAllAsRead}
        >
          Mark all as read
        </button>
      {/if}
    </div>
  </div>

  <!-- Notifications List -->
  <div class="space-y-3">
    {#if data.notifications.length === 0}
      <div class="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <p class="text-slate-600 text-lg">No notifications yet</p>
        <p class="text-slate-500 text-sm mt-2">Check back later for updates</p>
      </div>
    {:else}
      {#each data.notifications as notification (notification.id)}
        <div
          class="bg-white border-l-4 p-4 rounded-lg hover:shadow-md transition-shadow cursor-pointer {getNotificationColor(notification.type)}"
          on:click={() => markAsRead(notification.id, notification.isRead)}
        >
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="flex-shrink-0 text-2xl">
              {getNotificationIcon(notification.type)}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="font-semibold text-slate-900">{notification.title}</h3>
                  <p class="text-slate-700 text-sm mt-1">{notification.message}</p>
                  <div class="flex items-center gap-2 mt-3">
                    <span class="text-xs text-slate-500">
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: new Date(notification.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                      at
                      {new Date(notification.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span class="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-medium">
                      {notification.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <!-- Unread Indicator -->
                {#if !notification.isRead}
                  <div class="flex-shrink-0">
                    <div class="w-3 h-3 rounded-full bg-blue-500" title="Unread" />
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="mt-8 flex items-center justify-center gap-2">
      {#if data.page > 1}
        <a
          href="/notifications?page={data.page - 1}"
          class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium"
        >
          Previous
        </a>
      {/if}

      {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const start = Math.max(1, data.page - 2);
        return start + i;
      }) as pageNum}
        {#if pageNum <= totalPages}
          <a
            href="/notifications?page={pageNum}"
            class="px-3 py-2 rounded-lg text-sm font-medium"
            class:bg-blue-600={pageNum === data.page}
            class:text-white={pageNum === data.page}
            class:border={pageNum !== data.page}
            class:border-slate-300={pageNum !== data.page}
            class:hover:bg-slate-50={pageNum !== data.page}
          >
            {pageNum}
          </a>
        {/if}
      {/each}

      {#if data.page < totalPages}
        <a
          href="/notifications?page={data.page + 1}"
          class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium"
        >
          Next
        </a>
      {/if}
    </div>
  {/if}
</div>
