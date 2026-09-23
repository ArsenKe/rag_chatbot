<script lang="ts">
  export let events: Array<{
    bookingId?: string;
    title: string;
    start: string;
    end: string;
    status?: string;
    source?: 'app' | 'google';
  }> = [];

  let currentDate = new Date();
  let viewMode: 'month' | 'week' = 'month';

  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function getEventsForDate(date: Date): typeof events {
    const dateKey = formatDateKey(date);
    return events.filter((e) => {
      const eventDateKey = e.start.split('T')[0];
      return eventDateKey === dateKey;
    });
  }

  function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  function previousWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    currentDate = d;
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    currentDate = d;
  }

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function getWeekDays(date: Date): Date[] {
    const start = getWeekStart(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  $: daysInMonth = getDaysInMonth(currentDate);
  $: firstDay = getFirstDayOfMonth(currentDate);
  $: monthYear = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  $: weekDays = getWeekDays(currentDate);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<div class="rounded-2xl border bg-white p-4 shadow-sm">
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-slate-900">{monthYear}</h3>
    <div class="flex gap-2">
      <button
        class="rounded-lg border px-2 py-1 text-xs font-medium hover:bg-slate-50"
        on:click={viewMode === 'month' ? previousMonth : previousWeek}
      >
        ← Previous
      </button>
      <div class="flex gap-1 rounded-lg border bg-slate-50 p-1">
        <button
          class={`rounded px-2 py-1 text-xs font-medium transition ${viewMode === 'month' ? 'bg-white shadow-sm' : ''}`}
          on:click={() => (viewMode = 'month')}
        >
          Month
        </button>
        <button
          class={`rounded px-2 py-1 text-xs font-medium transition ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}
          on:click={() => (viewMode = 'week')}
        >
          Week
        </button>
      </div>
      <button
        class="rounded-lg border px-2 py-1 text-xs font-medium hover:bg-slate-50"
        on:click={viewMode === 'month' ? nextMonth : nextWeek}
      >
        Next →
      </button>
    </div>
  </div>

  {#if viewMode === 'month'}
    <!-- Month View -->
    <div class="grid grid-cols-7 gap-1">
      <!-- Day headers -->
      {#each dayNames as dayName}
        <div class="rounded-lg bg-slate-100 px-2 py-2 text-center text-xs font-semibold text-slate-700">
          {dayName}
        </div>
      {/each}

      <!-- Empty cells for days before month start -->
      {#each Array(firstDay) as _}
        <div class="aspect-square"></div>
      {/each}

      <!-- Calendar days -->
      {#each Array(daysInMonth) as _, i}
        {@const day = i + 1}
        {@const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)}
        {@const dayEvents = getEventsForDate(dateObj)}
        {@const isToday = formatDateKey(new Date()) === formatDateKey(dateObj)}
        <div
          class={`aspect-square rounded-lg border p-1 text-xs ${isToday ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} transition hover:border-blue-200 hover:bg-blue-50`}
        >
          <div class="font-semibold text-slate-900">{day}</div>
          <div class="mt-1 space-y-0.5">
            {#each dayEvents.slice(0, 2) as event}
              <div
                class={`truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${event.source === 'google' ? 'bg-blue-500' : 'bg-teal-500'}`}
                title={event.title}
              >
                {event.title}
              </div>
            {/each}
            {#if dayEvents.length > 2}
              <div class="text-[10px] text-slate-500">+{dayEvents.length - 2} more</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Week View -->
    <div class="overflow-x-auto">
      <div class="inline-block w-full min-w-max">
        <div class="grid grid-cols-7 gap-2">
          {#each weekDays as date}
            {@const dayEvents = getEventsForDate(date)}
            {@const isToday = formatDateKey(new Date()) === formatDateKey(date)}
            <div class={`rounded-lg border p-2 ${isToday ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <div class="mb-2 text-center text-sm font-semibold text-slate-900">
                {date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div class="space-y-1">
                {#each dayEvents as event}
                  <div
                    class={`truncate rounded px-2 py-1 text-xs font-medium text-white ${event.source === 'google' ? 'bg-blue-500' : 'bg-teal-500'}`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="mt-4 border-t pt-3">
    <div class="flex gap-4 text-xs text-slate-600">
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded bg-teal-500"></div>
        <span>Assigned jobs</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded bg-blue-500"></div>
        <span>Google Calendar</span>
      </div>
    </div>
  </div>
</div>
