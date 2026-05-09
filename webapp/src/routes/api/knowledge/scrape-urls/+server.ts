import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import { toErrorResponse, success } from '$lib/server/api/responses';
import { getAIBaseUrl } from '$lib/server/ai/base_url';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const body = await request.json().catch(() => ({}));
    const urls = Array.isArray(body?.urls)
      ? body.urls.filter((value: unknown) => typeof value === 'string' && value.trim())
      : [];

    if (!urls.length) {
      throw error(400, 'At least one URL is required');
    }

    const forward = new FormData();
    for (const url of urls) {
      forward.append('urls', String(url).trim());
    }

    const response = await fetch(`${getAIBaseUrl()}/data/scrape-urls`, {
      method: 'POST',
      body: forward
    });

    const payload = await response.json();
    if (!response.ok) {
      throw error(response.status, payload?.detail ?? payload?.message ?? 'URL scraping failed');
    }

    return success(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
