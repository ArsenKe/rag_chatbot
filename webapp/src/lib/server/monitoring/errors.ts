import * as Sentry from '@sentry/sveltekit';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';

    // Capture in Sentry
    if (statusCode >= 500) {
      Sentry.captureException(this, {
        contexts: {
          api: context
        }
      });
    }
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode
    });
  }

  const err = error as Error;
  Sentry.captureException(err);

  return new Response(
    JSON.stringify({ error: 'Internal Server Error', message: err.message }),
    {
      status: 500
    }
  );
}

export async function traceAsyncOperation<T>(
  name: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name,
    op: 'async_operation'
  });

  if (context) {
    transaction.setContext('operation', context);
  }

  try {
    const result = await fn();
    transaction.finish();
    return result;
  } catch (error) {
    transaction.captureException(error);
    transaction.finish();
    throw error;
  }
}
