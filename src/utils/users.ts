export function getUserMeta(user?: {
  raw_user_meta_data?: Record<string, any>;
  user_metadata?: Record<string, any>;
} | null) {
  return user?.raw_user_meta_data || user?.user_metadata || {};
}

export function isDeletedUser(user?: {
  raw_user_meta_data?: Record<string, any>;
  user_metadata?: Record<string, any>;
} | null) {
  const meta = getUserMeta(user);
  return Boolean(meta.deleted);
}

export function isAdminUser(user?: {
  type?: string;
  raw_user_meta_data?: Record<string, any>;
  user_metadata?: Record<string, any>;
} | null) {
  const meta = getUserMeta(user);
  return user?.type === 'admin' || meta.type === 'admin';
}

export function activeUsers<T extends {
  raw_user_meta_data?: Record<string, any>;
  user_metadata?: Record<string, any>;
}>(users?: T[] | null): T[] {
  return (users || []).filter(user => !isDeletedUser(user));
}

export async function readFunctionError(error: any, fallback = 'Request failed') {
  let message = error?.message || fallback;
  try {
    const errorBody = await (error.context as any)?.json?.();
    if (errorBody?.error) {
      message = errorBody.error;
    } else if (errorBody?.details) {
      message = errorBody.details;
    }
  } catch (e) {
    // Keep the original message if the function body cannot be parsed.
  }
  return message;
}

export function isDeletedLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /banned|deleted/i.test(message);
}
