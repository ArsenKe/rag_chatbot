import type { RequestHandler } from './$types';
import { success } from '$lib/server/api/responses';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('token', { path: '/' });
  return success({ ok: true });
};