import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { getCalendarEvents } from '$lib/server/google-calendar/client';

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role !== 'driver') {
    return json({ error: { message: 'Only drivers can sync Google Calendar' } }, { status: 403 });
  }

  const driverId = locals.user.driverId;
  if (!driverId) {
    return json({ error: { message: 'Driver profile not linked' } }, { status: 400 });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver?.googleCalendarAccessToken) {
      return json({ error: { message: 'Google Calendar not connected' } }, { status: 400 });
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);

    const events = await getCalendarEvents(
      driver.googleCalendarAccessToken,
      driver.googleCalendarRefreshToken,
      startDate.toISOString(),
      endDate.toISOString()
    );

    await prisma.driver.update({
      where: { id: driverId },
      data: { googleCalendarSyncedAt: new Date() }
    });

    return json({
      data: events.map((event: any) => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        source: 'google'
      }))
    });
  } catch (err) {
    console.error('Google Calendar sync error:', err);
    return json({ error: { message: 'Failed to sync Google Calendar' } }, { status: 500 });
  }
}

export async function DELETE({ locals }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role !== 'driver') {
    return json({ error: { message: 'Only drivers can disconnect Google Calendar' } }, { status: 403 });
  }

  const driverId = locals.user.driverId;
  if (!driverId) {
    return json({ error: { message: 'Driver profile not linked' } }, { status: 400 });
  }

  try {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarSyncedAt: null
      }
    });

    return json({ data: { success: true } });
  } catch (err) {
    console.error('Google Calendar disconnect error:', err);
    return json({ error: { message: 'Failed to disconnect Google Calendar' } }, { status: 500 });
  }
}
