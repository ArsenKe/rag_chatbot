import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals }) => {
  requireRole(locals.user?.role, ['driver']);
  return {};
};
