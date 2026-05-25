<script lang="ts">
  import { supabase } from '$lib/supabase/client';

  let email = '';
  let password = '';
  let authMode: 'supabase' | 'local' = 'supabase';
  let errorMsg = '';
  let loading = false;

  function mapAuthError(message: string | undefined) {
    const text = (message ?? '').toLowerCase();
    if (text.includes('invalid login credentials')) {
      return 'Wrong email or password in Supabase. Reset password or verify the invited email.';
    }
    if (text.includes('email not confirmed')) {
      return 'Email not confirmed yet. Open the Supabase invite/confirmation email first.';
    }
    return message ?? 'Supabase sign-in failed';
  }

  function mapAppError(code: string | undefined, message: string | undefined) {
    if (code === 'unknown_user') {
      return 'Account exists in Supabase, but no app role mapping exists. Ask admin to add this email in Users.';
    }
    if (code === 'driver_mapping_missing') {
      return 'Driver role is mapped, but no Driver profile is linked. Ask admin to link user.driverId.';
    }
    if (code === 'invalid_supabase_session') {
      return 'Supabase session is invalid or expired. Please sign in again.';
    }
    if (code === 'invalid_local_credentials') {
      return 'Invalid local account email or password.';
    }
    return message ?? 'Login failed';
  }

  async function onSubmit() {
    errorMsg = '';
    loading = true;

    let payload: Record<string, string>;

    if (authMode === 'supabase') {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.session?.access_token) {
        loading = false;
        errorMsg = mapAuthError(authError?.message);
        return;
      }

      payload = { accessToken: authData.session.access_token };
    } else {
      payload = { email: email.trim().toLowerCase(), password };
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    loading = false;

    if (!res.ok) {
      errorMsg = mapAppError(body?.error?.code, body?.error?.message);
      return;
    }

    const next = new URL(window.location.href).searchParams.get('next');
    window.location.href = next || body?.data?.redirectTo || '/dashboard';
  }
</script>

<div class="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
  <div class="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
    <h1 class="text-2xl font-bold mb-2">Royal E-Cars Login</h1>
    <p class="text-slate-300 mb-6">Sign in with your Supabase account. Roles are loaded from the app database.</p>

    <div class="space-y-4">
      <label class="block">
        <span class="text-sm text-slate-300">Email</span>
        <input bind:value={email} class="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2" type="email" required />
      </label>
      <label class="block">
        <span class="text-sm text-slate-300">Login mode</span>
        <select bind:value={authMode} class="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2">
          <option value="supabase">Supabase account</option>
          <option value="local">Local app account</option>
        </select>
      </label>

      <label class="block">
        <span class="text-sm text-slate-300">Password</span>
        <input bind:value={password} class="w-full mt-1 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2" type="password" required />
      </label>

      <button on:click={onSubmit} class="w-full bg-brand hover:bg-brand-dark rounded-lg py-2 font-semibold disabled:opacity-60" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      {#if errorMsg}
        <p class="text-red-300 text-sm">{errorMsg}</p>
      {/if}

      <p class="text-xs text-slate-400">
        Local mode: admin-created account in Users with password. Supabase mode: Supabase identity + role mapping.
      </p>
    </div>
  </div>
</div>
