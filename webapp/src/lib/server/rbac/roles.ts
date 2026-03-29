import { error } from '@sveltejs/kit';

export type AppRole = 'admin' | 'manager' | 'driver';

export function requireRole(currentRole: AppRole | undefined, allowed: AppRole[]) {
  if (!currentRole || !allowed.includes(currentRole)) {
    throw error(403, 'Forbidden');
  }
}
