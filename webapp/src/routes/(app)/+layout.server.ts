import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { canAccessAppPath, HOME_BY_ROLE } from '$lib/rbac/policy';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    const next = encodeURIComponent(url.pathname);
    throw redirect(307, `/login?next=${next}`);
  }

  if (!canAccessAppPath(locals.user.role, url.pathname)) {
    throw redirect(303, HOME_BY_ROLE[locals.user.role]);
  }

  return {
    user: locals.user
  };
};
