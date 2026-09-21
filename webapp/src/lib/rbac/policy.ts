export type AppRole = 'admin' | 'manager' | 'driver';

export const HOME_BY_ROLE: Record<AppRole, string> = {
  admin: '/dashboard',
  manager: '/bookings',
  driver: '/calendar'
};

export const NAV_BY_ROLE: Record<AppRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/users', label: 'Users' },
    { href: '/knowledge', label: 'Knowledge' },
    { href: '/drivers', label: 'Drivers' },
    { href: '/cars', label: 'Cars' },
    { href: '/customers', label: 'Customers' },
    { href: '/locations', label: 'Locations' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/reports', label: 'Reports' }
  ],
  manager: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/customers', label: 'Customers' },
    { href: '/locations', label: 'Locations' },
    { href: '/drivers', label: 'Drivers' },
    { href: '/cars', label: 'Cars' },
    { href: '/reports', label: 'Reports' }
  ],
  driver: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/calendar', label: 'My Schedule' },
    { href: '/bookings', label: 'My Trips' },
    { href: '/tours', label: 'City Tour' }
  ]
};

const ALLOWED_PREFIXES: Record<AppRole, string[]> = {
  admin: ['/dashboard', '/users', '/knowledge', '/drivers', '/cars', '/customers', '/locations', '/bookings', '/calendar', '/reports'],
  manager: ['/dashboard', '/drivers', '/cars', '/customers', '/locations', '/bookings', '/calendar', '/reports'],
  driver: ['/dashboard', '/bookings', '/calendar', '/tours']
};

export function canAccessAppPath(role: AppRole, pathname: string): boolean {
  const path = pathname.toLowerCase();
  return ALLOWED_PREFIXES[role].some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}
