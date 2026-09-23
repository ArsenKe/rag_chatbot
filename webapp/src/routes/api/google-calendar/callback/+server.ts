import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { getTokensFromCode } from '$lib/server/google-calendar/client';

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    throw redirect(307, '/calendar?error=google_auth_declined');
  }

  if (!code) {
    throw redirect(307, '/calendar?error=google_auth_failed');
  }

  if (!locals.user) {
    throw redirect(307, '/login');
  }

  try {
    const tokens = await getTokensFromCode(code);

    const driverId = locals.user.driverId;
    if (!driverId) {
      throw redirect(307, '/calendar?error=no_driver_profile');
    }

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarSyncedAt: new Date()
      }
    });

    throw redirect(307, '/calendar?success=google_connected');
  } catch (err) {
    console.error('Google Calendar OAuth error:', err);
    throw redirect(307, '/calendar?error=google_auth_error');
  }
}
