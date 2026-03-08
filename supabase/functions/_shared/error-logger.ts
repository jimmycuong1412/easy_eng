/**
 * Error Logging Utilities for Edge Functions (T226)
 *
 * Structured logging for errors, warnings, and important events
 * Integrates with Sentry and Supabase logs
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  functionName?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface ErrorLogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: LogContext;
  timestamp: string;
  stack?: string;
}

/**
 * Enhanced logger for Edge Functions
 */
export class EdgeFunctionLogger {
  private functionName: string;
  private context: LogContext;

  constructor(functionName: string, baseContext: LogContext = {}) {
    this.functionName = functionName;
    this.context = {
      functionName,
      ...baseContext,
    };
  }

  /**
   * Extract context from request
   */
  static extractRequestContext(req: Request): LogContext {
    const url = new URL(req.url);

    return {
      endpoint: url.pathname,
      method: req.method,
      ip: req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      requestId: req.headers.get('x-request-id') || crypto.randomUUID(),
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, undefined, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, undefined, data);
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, undefined, data);
  }

  /**
   * Log error
   */
  error(message: string, error?: Error | unknown, data?: any): void {
    const errorObj = error instanceof Error ? error : undefined;
    this.log(LogLevel.ERROR, message, errorObj, data);

    // Send to Sentry if available
    if (typeof Deno !== 'undefined' && (globalThis as any).Sentry) {
      (globalThis as any).Sentry.captureException(error, {
        tags: {
          function: this.functionName,
        },
        extra: {
          ...this.context,
          ...data,
        },
      });
    }
  }

  /**
   * Log fatal error (system-level)
   */
  fatal(message: string, error?: Error | unknown, data?: any): void {
    const errorObj = error instanceof Error ? error : undefined;
    this.log(LogLevel.FATAL, message, errorObj, data);

    // Send to Sentry as fatal
    if (typeof Deno !== 'undefined' && (globalThis as any).Sentry) {
      (globalThis as any).Sentry.captureException(error, {
        level: 'fatal',
        tags: {
          function: this.functionName,
        },
        extra: {
          ...this.context,
          ...data,
        },
      });
    }
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    data?: any
  ): void {
    const logEntry: ErrorLogEntry = {
      level,
      message,
      error,
      context: {
        ...this.context,
        ...data,
      },
      timestamp: new Date().toISOString(),
      stack: error?.stack,
    };

    // Format log output
    const logOutput = this.formatLog(logEntry);

    // Console output based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logOutput);
        break;
      case LogLevel.INFO:
        console.info(logOutput);
        break;
      case LogLevel.WARN:
        console.warn(logOutput);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logOutput);
        break;
    }

    // Store in database for ERROR and FATAL levels
    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.storeErrorLog(logEntry).catch((err) => {
        console.error('Failed to store error log:', err);
      });
    }
  }

  /**
   * Format log entry for output
   */
  private formatLog(entry: ErrorLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      `[${this.functionName}]`,
      entry.message,
    ];

    if (entry.context?.requestId) {
      parts.push(`[RequestID: ${entry.context.requestId}]`);
    }

    if (entry.context?.userId) {
      parts.push(`[UserID: ${entry.context.userId}]`);
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`);
      if (entry.stack) {
        parts.push(`\nStack: ${entry.stack}`);
      }
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2);
      parts.push(`\nContext: ${contextStr}`);
    }

    return parts.join(' ');
  }

  /**
   * Store error log in database
   */
  private async storeErrorLog(entry: ErrorLogEntry): Promise<void> {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.warn('Supabase credentials not available for error logging');
        return;
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('error_logs').insert({
        level: entry.level,
        message: entry.message,
        function_name: this.functionName,
        error_message: entry.error?.message,
        error_stack: entry.stack,
        context: entry.context,
        user_id: entry.context?.userId,
        request_id: entry.context?.requestId,
        occurred_at: entry.timestamp,
      });
    } catch (error) {
      console.error('Failed to store error in database:', error);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): EdgeFunctionLogger {
    return new EdgeFunctionLogger(this.functionName, {
      ...this.context,
      ...additionalContext,
    });
  }
}

/**
 * Create logger instance for Edge Function
 */
export function createLogger(
  functionName: string,
  req?: Request
): EdgeFunctionLogger {
  const context = req ? EdgeFunctionLogger.extractRequestContext(req) : {};
  return new EdgeFunctionLogger(functionName, context);
}

/**
 * Async error handler wrapper
 */
export async function withErrorHandler<T>(
  logger: EdgeFunctionLogger,
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error);
    throw error;
  }
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Performance measurement wrapper
 */
export async function measurePerformance<T>(
  logger: EdgeFunctionLogger,
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    logger.info(`${operationName} completed`, {
      duration_ms: duration,
      status: 'success',
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`${operationName} failed`, error, {
      duration_ms: duration,
      status: 'error',
    });

    throw error;
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * import { createLogger, errorResponse, successResponse } from '../_shared/error-logger.ts';
 *
 * Deno.serve(async (req) => {
 *   const logger = createLogger('award-gems', req);
 *
 *   try {
 *     logger.info('Processing gem award request');
 *
 *     // Your logic here
 *     const result = await awardGems(userId, amount);
 *
 *     logger.info('Gems awarded successfully', { userId, amount });
 *
 *     return successResponse(result);
 *   } catch (error) {
 *     logger.error('Failed to award gems', error, { userId, amount });
 *     return errorResponse('Failed to award gems', 500);
 *   }
 * });
 * ```
 */
