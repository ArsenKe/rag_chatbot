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
  return json({ data: toJsonSafe(data) }, init);
}

export function failure(status: number, code: string, message: string, details?: unknown) {
  return json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details: toJsonSafe(details) })
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

function toJsonSafe<T>(value: T): T {
  if (typeof value === 'bigint') {
    return value.toString() as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item)) as T;
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(input)) {
      output[key] = toJsonSafe(item);
    }

    return output as T;
  }

  return value;
}