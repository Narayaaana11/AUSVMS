/**
 * Error Handling Utilities
 * Provides comprehensive error handling, validation, and async operations helpers
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Resource not found
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: Record<string, unknown>) {
    super(404, message, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

// Authorization errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'Unauthorized access', details?: Record<string, unknown>) {
    super(403, message, 'FORBIDDEN', details);
    this.name = 'AuthorizationError';
  }
}

// Authentication errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(401, message, 'UNAUTHENTICATED', details);
    this.name = 'AuthenticationError';
  }
}

// Server errors
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details);
    this.name = 'InternalServerError';
  }
}

/**
 * Async error wrapper for Express route handlers
 * Catches unhandled promise rejections and passes to error middleware
 */
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation wrapper for request payload
 */
export const validateRequest = <T>(
  data: unknown,
  validator: (data: unknown) => T,
  errorMessage: string = 'Invalid request data'
): T => {
  try {
    return validator(data);
  } catch (error) {
    const details = error instanceof Error ? { originalError: error.message } : { originalError: String(error) };
    throw new ValidationError(errorMessage, details);
  }
};

/**
 * Safe async operation executor
 * Wraps async operations with error handling and optional retry logic
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: Error, attempt: number) => void;
  }
): Promise<T> => {
  const maxRetries = options?.maxRetries ?? 0;
  const retryDelay = options?.retryDelay ?? 1000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(lastError, attempt + 1);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw lastError || new InternalServerError('Operation failed');
};

/**
 * Timeout wrapper for promises
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

/**
 * Result type for operations that may fail
 */
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

/**
 * Wrapper function that returns Result type
 */
export const tryCatch = async <T>(
  fn: () => Promise<T>
): Promise<Result<T>> => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new InternalServerError(error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: appError };
  }
};

/**
 * Input validation schema helpers
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  },

  date: (date: string): boolean => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  },

  isNotEmpty: (value: string): boolean => {
    return value && value.trim().length > 0;
  },

  minLength: (value: string, min: number): boolean => {
    return value && value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value && value.length <= max;
  }
};

/**
 * Safe object access with default values
 */
export const safeGet = <T>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined => {
  try {
    const value = path.split('.').reduce((acc, part) => acc?.[part], obj);
    return value ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Error message formatter
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
