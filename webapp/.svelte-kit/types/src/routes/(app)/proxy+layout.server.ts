// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals, url }: Parameters<LayoutServerLoad>[0]) => {
  if (!locals.user) {
    const next = encodeURIComponent(url.pathname);
    redirect(307, `/login?next=${next}`);
  }

  return {
    user: locals.user
  };
};
