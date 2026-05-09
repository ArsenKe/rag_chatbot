import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { toErrorResponse, success } from '$lib/server/api/responses';
import { getAIBaseUrl } from '$lib/server/ai/base_url';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const body = await request.json().catch(() => ({}));
    const folderId = typeof body?.folderId === 'string' ? body.folderId.trim() : '';

    if (!folderId) {
      throw error(400, 'folderId is required');
    }

    const forward = new FormData();
    forward.append('folder_id', folderId);

    const response = await fetch(`${getAIBaseUrl()}/data/scrape-gdrive`, {
      method: 'POST',
      body: forward
    });

    const payload = await response.json();
    if (!response.ok) {
      throw error(response.status, payload?.detail ?? payload?.message ?? 'Google Drive import failed');
    }

    return success(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
