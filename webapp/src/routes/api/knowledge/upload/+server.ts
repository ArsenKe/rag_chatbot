import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { toErrorResponse, success } from '$lib/server/api/responses';
import { getAIBaseUrl, getRagAdminToken } from '$lib/server/ai/base_url';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw error(400, 'file is required');
    }

    const forward = new FormData();
    forward.append('file', file, file.name);

    const response = await fetch(`${getAIBaseUrl()}/data/upload-file`, {
      method: 'POST',
      headers: {
        'X-RAG-ADMIN-TOKEN': getRagAdminToken()
      },
      body: forward
    });

    const payload = await response.json();
    if (!response.ok) {
      throw error(response.status, payload?.detail ?? payload?.message ?? 'Upload failed');
    }

    return success(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
