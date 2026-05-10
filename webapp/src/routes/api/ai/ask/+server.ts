import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toErrorResponse } from '$lib/server/api/responses';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  try {
    if (!locals.user) {
      throw error(401, 'Unauthorized');
    }

    const body = await request.json();
    if (typeof body?.text !== 'string' || !body.text.trim()) {
      throw error(400, 'text is required');
    }

    const normalizedHistory = Array.isArray(body?.history)
      ? body.history
          .filter((item: unknown) => {
            if (!item || typeof item !== 'object') return false;
            const rec = item as Record<string, unknown>;
            return (
              (rec.role === 'user' || rec.role === 'assistant') &&
              typeof rec.text === 'string' &&
              rec.text.trim().length > 0
            );
          })
          .slice(-8)
          .map((item: Record<string, unknown>) => ({
            role: item.role as 'user' | 'assistant',
            text: (item.text as string).trim()
          }))
      : [];

    const base = process.env.SVELTEKIT_API_BASE_URL ?? process.env.FASTAPI_BASE_URL;
    if (!base) {
      throw error(500, 'SVELTEKIT_API_BASE_URL is missing');
    }

    const response = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body.text.trim(), history: normalizedHistory })
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      if (isJson) {
        throw error(response.status, payload?.detail ?? payload?.message ?? 'AI API error');
      }

      throw error(
        response.status,
        'AI upstream returned non-JSON. Verify SVELTEKIT_API_BASE_URL points to FastAPI public domain (no trailing slash).'
      );
    }

    if (!isJson) {
      throw error(
        502,
        'AI upstream returned non-JSON success payload. Verify SVELTEKIT_API_BASE_URL points to FastAPI public domain.'
      );
    }

    return json(payload);
  } catch (cause) {
    return toErrorResponse(cause);
  }
};
