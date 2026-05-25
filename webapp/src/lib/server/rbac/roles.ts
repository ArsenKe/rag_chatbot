import { error } from '@sveltejs/kit';
import type { AppRole } from '$lib/rbac/policy';

export function requireRole(currentRole: AppRole | undefined, allowed: AppRole[]) {
  if (!currentRole || !allowed.includes(currentRole)) {
    throw error(403, 'Forbidden');
  }
}
