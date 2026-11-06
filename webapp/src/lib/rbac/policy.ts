export type AppRole = 'admin' | 'manager' | 'driver';

export const HOME_BY_ROLE: Record<AppRole, string> = {
  admin: '/dashboard',
  manager: '/bookings',
  driver: '/tours'
};

export const NAV_BY_ROLE: Record<AppRole, Array<{ href: string; label: string }>> = {
  admin: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dispatch', label: 'Dispatch' },
    { href: '/revenue', label: 'Revenue' },
    { href: '/users', label: 'Users' },
    { href: '/knowledge', label: 'Knowledge' },
    { href: '/drivers', label: 'Drivers' },
    { href: '/cars', label: 'Cars' },
    { href: '/customers', label: 'Customers' },
    { href: '/locations', label: 'Locations' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/tour-pricing', label: 'Tour Pricing' },
    { href: '/reports', label: 'Reports' }
  ],
  manager: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dispatch', label: 'Dispatch' },
    { href: '/revenue', label: 'Revenue' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/customers', label: 'Customers' },
    { href: '/locations', label: 'Locations' },
    { href: '/drivers', label: 'Drivers' },
    { href: '/cars', label: 'Cars' },
    { href: '/tour-pricing', label: 'Tour Pricing' },
    { href: '/reports', label: 'Reports' }
  ],
  driver: [
    { href: '/tours', label: 'City Tour' },
    { href: '/earnings', label: 'My Earnings' },
    { href: '/driver-withdrawals', label: 'Withdrawals' },
    { href: '/ratings', label: 'My Ratings' },
    { href: '/dashboard', label: 'Analytics' },
    { href: '/calendar', label: 'My Schedule' }
  ]
};

const ALLOWED_PREFIXES: Record<AppRole, string[]> = {
  admin: ['/dashboard', '/dispatch', '/revenue', '/users', '/withdrawals', '/knowledge', '/drivers', '/cars', '/customers', '/locations', '/bookings', '/calendar', '/tour-pricing', '/reports', '/notifications'],
  manager: ['/dashboard', '/dispatch', '/revenue', '/withdrawals', '/drivers', '/cars', '/customers', '/locations', '/bookings', '/calendar', '/tour-pricing', '/reports', '/notifications'],
  driver: ['/tours', '/earnings', '/driver-withdrawals', '/ratings', '/dashboard', '/calendar', '/notifications']
};

export function canAccessAppPath(role: AppRole, pathname: string): boolean {
  const path = pathname.toLowerCase();
  return ALLOWED_PREFIXES[role].some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}
