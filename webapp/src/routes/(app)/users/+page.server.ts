import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
  // Only admins can manage users
  requireRole(locals.user?.role, ['admin']);

  const skip = parseInt(url.searchParams.get('skip') ?? '0');
  const take = 20;
  const searchTerm = url.searchParams.get('search') ?? '';
  const roleFilter = url.searchParams.get('role') ?? 'all';

  // Build query filters
  const whereClause: any = {};
  if (searchTerm) {
    whereClause.OR = [
      { email: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }
  if (roleFilter !== 'all') {
    whereClause.role = roleFilter;
  }

  // Fetch users with their linked profiles
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take
    }),
    prisma.user.count({ where: whereClause })
  ]);

  // Format users for display
  const formattedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    linkedProfile: user.driverId
      ? 'Driver'
      : user.customerId
        ? 'Customer'
        : 'None',
    driverId: user.driverId?.toString() ?? null,
    customerId: user.customerId?.toString() ?? null,
    customerName: user.customer?.name ?? null
  }));

  // Get all drivers and customers for linking options
  const [allDrivers, allCustomers] = await Promise.all([
    prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        licenseNumber: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  return {
    currentUserId: locals.user?.id ?? null,
    users: formattedUsers,
    pagination: {
      skip,
      take,
      total: totalCount,
      hasMore: skip + take < totalCount
    },
    filters: {
      search: searchTerm,
      role: roleFilter
    },
    linkedProfileOptions: {
      availableDrivers: allDrivers.map(d => ({
        id: d.id.toString(),
        name: d.name,
        license: d.licenseNumber
      })),
      availableCustomers: allCustomers.map(c => ({
        id: c.id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone
      }))
    }
  };
};