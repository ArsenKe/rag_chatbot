<script lang="ts">
  let email = '';
  let role: 'admin' | 'manager' | 'driver' = 'admin';
  let errorMsg = '';

  async function onSubmit() {
    errorMsg = '';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });

    if (!res.ok) {
      const body = await res.json();
      errorMsg = body.error ?? 'Login failed';
      return;
    }

    window.location.href = '/dashboard';
  }
</script>

<div class="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
    <h1 class="text-2xl font-bold mb-2">Royal E-Cars Login</h1>
    <p class="text-slate-300 mb-6">JWT demo login for role-based access.</p>

    <div class="space-y-4">
      <label class="block">
        <span class="text-sm text-slate-300">Email</span>
        <input bind:value={email} class="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2" type="email" required />
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">Role</span>
        <select bind:value={role} class="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2">
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="driver">Driver</option>
        </select>
      </label>

      <button on:click={onSubmit} class="w-full bg-brand hover:bg-brand-dark rounded-lg py-2 font-semibold">
        Sign in
      </button>

      {#if errorMsg}
        <p class="text-red-300 text-sm">{errorMsg}</p>
      {/if}
    </div>
  </div>
</div>
