import { env } from '$env/dynamic/private';

export function getAIBaseUrl(): string {
  const base = env.SVELTEKIT_API_BASE_URL ?? env.FASTAPI_BASE_URL;
  if (!base) {
    throw new Error('SVELTEKIT_API_BASE_URL is missing');
  }

  return base.endsWith('/') ? base.slice(0, -1) : base;
}
