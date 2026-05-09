import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { toErrorResponse, success } from '$lib/server/api/responses';
import { getAIBaseUrl, getRagAdminToken } from '$lib/server/ai/base_url';

export const GET: RequestHandler = async ({ locals, fetch }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const response = await fetch(`${getAIBaseUrl()}/data/stats`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-RAG-ADMIN-TOKEN': getRagAdminToken()
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      throw error(response.status, payload?.detail ?? payload?.message ?? 'Failed to fetch knowledge stats');
    }

    return success(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
