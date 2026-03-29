import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const base = process.env.SVELTEKIT_API_BASE_URL ?? process.env.FASTAPI_BASE_URL;
  if (!base) {
    throw error(500, 'SVELTEKIT_API_BASE_URL is missing');
  }

  const response = await fetch(`${base}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: body.text })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw error(response.status, payload?.detail ?? 'AI API error');
  }

  return json(payload);
};
