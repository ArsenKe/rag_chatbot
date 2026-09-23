import { json } from '@sveltejs/kit';
import { getAuthUrl } from '$lib/server/google-calendar/client';

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role !== 'driver') {
    return json({ error: { message: 'Only drivers can connect Google Calendar' } }, { status: 403 });
  }

  if (!locals.user.driverId) {
    return json({ error: { message: 'Driver profile not linked' } }, { status: 400 });
  }

  try {
    const authUrl = getAuthUrl();
    return json({ data: { url: authUrl } });
  } catch (err) {
    console.error('Google auth URL generation error:', err);
    return json({ error: { message: 'Failed to generate auth URL' } }, { status: 500 });
  }
}
