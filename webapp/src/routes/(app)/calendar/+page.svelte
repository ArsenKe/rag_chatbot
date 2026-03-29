<script lang="ts">
  import ScheduleCalendar from '$lib/components/calendar/ScheduleCalendar.svelte';

  const events = [
    { title: 'Trip #101', start: '2026-03-23 09:00', end: '2026-03-23 11:00', driver: 'TBD', car: 'TBD' }
  ];
</script>

<h2 class="text-xl font-semibold mb-4">Schedule Calendar</h2>
<ScheduleCalendar {events} />
