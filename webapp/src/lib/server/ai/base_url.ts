import { env } from '$env/dynamic/private';

export function getAIBaseUrl(): string {
  const base = env.SVELTEKIT_API_BASE_URL ?? env.FASTAPI_BASE_URL;
  if (!base) {
    throw new Error('SVELTEKIT_API_BASE_URL is missing');
  }

  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function getRagAdminToken(): string {
  const token = env.RAG_ADMIN_TOKEN?.trim();
  if (!token) {
    throw new Error('RAG_ADMIN_TOKEN is missing');
  }

  return token;
}
