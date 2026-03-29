<script lang="ts">
  export let data;
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-100 to-white">
  <header class="border-b bg-white sticky top-0 z-20">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div>
        <h1 class="font-bold text-lg">Royal E-Cars Operations</h1>
        <p class="text-xs text-slate-500">Role: {data.user?.role}</p>
      </div>
      <nav class="flex gap-3 text-sm">
        <a class="hover:text-brand" href="/dashboard">Dashboard</a>
        <a class="hover:text-brand" href="/drivers">Drivers</a>
        <a class="hover:text-brand" href="/cars">Cars</a>
        <a class="hover:text-brand" href="/bookings">Bookings</a>
        <a class="hover:text-brand" href="/calendar">Calendar</a>
        <a class="hover:text-brand" href="/reports">Reports</a>
      </nav>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6">
    <slot />
  </main>
</div>
