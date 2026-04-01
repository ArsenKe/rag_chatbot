import { error as kitError, json } from '@sveltejs/kit';
import { Prisma } from '@prisma/client';
import type { ZodError } from 'zod';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function success<T>(data: T, init?: ResponseInit) {
  return json({ data }, init);
}

export function failure(status: number, code: string, message: string, details?: unknown) {
  return json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details })
      }
    } satisfies ErrorBody,
    { status }
  );
}

export function toErrorResponse(cause: unknown) {
  if (isHttpErrorLike(cause)) {
    return failure(cause.status, 'http_error', cause.body?.message ?? cause.message ?? 'Request failed');
  }

  if (isZodError(cause)) {
    return failure(400, 'validation_error', 'Invalid request payload', cause.flatten());
  }

  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return failure(400, cause.code, 'Database request failed', cause.meta);
  }

  if (cause instanceof Prisma.PrismaClientValidationError) {
    return failure(400, 'prisma_validation_error', cause.message);
  }

  if (cause instanceof Error) {
    return failure(500, 'internal_error', cause.message);
  }

  return failure(500, 'internal_error', 'Unexpected server error');
}

export function httpError(status: number, message: string): never {
  throw kitError(status, message);
}

function isHttpErrorLike(value: unknown): value is {
  status: number;
  body?: { message?: string };
  message?: string;
} {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'status' in value &&
      typeof (value as { status: unknown }).status === 'number'
  );
}

function isZodError(value: unknown): value is ZodError {
  return Boolean(value && typeof value === 'object' && 'name' in value && (value as { name?: string }).name === 'ZodError');
}