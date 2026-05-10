import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { toErrorResponse, success } from '$lib/server/api/responses';
import { getAIBaseUrl, getRagAdminToken } from '$lib/server/ai/base_url';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    // Browser confirmation must be explicitly forwarded for destructive actions.
    const body = await request.json().catch(() => ({}));
    const confirm = Boolean(body?.confirm);
    if (!confirm) {
      throw error(400, 'Confirmation required');
    }

    const response = await fetch(`${getAIBaseUrl()}/data/clear?confirm=true`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-RAG-ADMIN-TOKEN': getRagAdminToken()
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      throw error(response.status, payload?.detail ?? payload?.message ?? 'Clear request failed');
    }

    return success(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
