import { requireRole } from '$lib/server/rbac/roles';

export const load = async ({ locals }: { locals: App.Locals }) => {
  requireRole(locals.user?.role, ['admin']);

  return {
    currentUserId: locals.user?.id ?? null
  };
};