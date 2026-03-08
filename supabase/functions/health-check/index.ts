/**
 * Health Check Endpoint (T245)
 *
 * Provides system health status for monitoring and uptime checks
 * Checks database, external services, and system resources
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createLogger } from '../_shared/error-logger.ts';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: ServiceCheck;
    supabase: ServiceCheck;
    cometchat?: ServiceCheck;
    memory?: SystemCheck;
    responseTime?: number;
  };
  version: string;
  uptime?: number;
}

interface ServiceCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: any;
}

interface SystemCheck {
  status: 'ok' | 'warning' | 'critical';
  value: number;
  threshold: number;
  unit: string;
}

/**
 * Check database connectivity and response time
 */
async function checkDatabase(
  supabase: any
): Promise<ServiceCheck> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const responseTime = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') {
      return {
        status: 'down',
        responseTime,
        message: error.message,
      };
    }

    // Response time thresholds
    if (responseTime > 1000) {
      return {
        status: 'degraded',
        responseTime,
        message: 'Database response time is slow',
      };
    }

    return {
      status: 'up',
      responseTime,
      message: 'Database is operational',
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

/**
 * Check Supabase services (Auth, Storage, etc.)
 */
async function checkSupabase(
  supabase: any
): Promise<ServiceCheck> {
  const startTime = Date.now();

  try {
    // Test auth service
    const { error } = await supabase.auth.getSession();

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'degraded',
        responseTime,
        message: 'Supabase services partially available',
      };
    }

    return {
      status: 'up',
      responseTime,
      message: 'Supabase services operational',
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Supabase check failed',
    };
  }
}

/**
 * Check CometChat service availability
 */
async function checkCometChat(): Promise<ServiceCheck> {
  const appId = Deno.env.get('NEXT_PUBLIC_COMETCHAT_APP_ID');

  if (!appId) {
    return {
      status: 'down',
      message: 'CometChat not configured',
    };
  }

  const startTime = Date.now();

  try {
    // Ping CometChat API
    const response = await fetch(
      `https://api-us.cometchat.io/v3/apps/${appId}`,
      {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'up',
        responseTime,
        message: 'CometChat is operational',
      };
    }

    return {
      status: 'degraded',
      responseTime,
      message: `CometChat returned status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'CometChat check failed',
    };
  }
}

/**
 * Check system memory usage
 */
function checkMemory(): SystemCheck {
  try {
    const memInfo = Deno.systemMemoryInfo();
    const totalMemory = memInfo.total;
    const freeMemory = memInfo.free;
    const usedPercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    let status: 'ok' | 'warning' | 'critical' = 'ok';

    if (usedPercent > 90) {
      status = 'critical';
    } else if (usedPercent > 80) {
      status = 'warning';
    }

    return {
      status,
      value: usedPercent,
      threshold: 80,
      unit: 'percent',
    };
  } catch {
    return {
      status: 'ok',
      value: 0,
      threshold: 80,
      unit: 'percent',
    };
  }
}

/**
 * Main health check handler
 */
Deno.serve(async (req) => {
  const logger = createLogger('health-check', req);
  const startTime = Date.now();

  try {
    logger.info('Health check requested');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run all checks in parallel
    const [databaseCheck, supabaseCheck, cometchatCheck] = await Promise.all([
      checkDatabase(supabase),
      checkSupabase(supabase),
      checkCometChat(),
    ]);

    // Check system resources
    const memoryCheck = checkMemory();

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      databaseCheck.status === 'down' ||
      supabaseCheck.status === 'down'
    ) {
      overallStatus = 'unhealthy';
    } else if (
      databaseCheck.status === 'degraded' ||
      supabaseCheck.status === 'degraded' ||
      cometchatCheck.status === 'degraded' ||
      memoryCheck.status === 'warning' ||
      memoryCheck.status === 'critical'
    ) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseCheck,
        supabase: supabaseCheck,
        cometchat: cometchatCheck,
        memory: memoryCheck,
        responseTime,
      },
      version: '1.0.0',
    };

    // Log unhealthy status
    if (overallStatus === 'unhealthy') {
      logger.error('System is unhealthy', undefined, result);
    } else if (overallStatus === 'degraded') {
      logger.warn('System is degraded', result);
    } else {
      logger.info('Health check passed', { responseTime });
    }

    const statusCode = overallStatus === 'healthy' ? 200 :
                       overallStatus === 'degraded' ? 200 : 503;

    return new Response(JSON.stringify(result, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.fatal('Health check failed', error);

    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'down', message: 'Health check error' },
        supabase: { status: 'down', message: 'Health check error' },
      },
      version: '1.0.0',
    };

    return new Response(JSON.stringify(errorResult, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
});

/**
 * Usage:
 *
 * 1. Health check endpoint:
 *    GET /health-check
 *
 * 2. Integration with monitoring tools:
 *    - Uptime Robot
 *    - Pingdom
 *    - Datadog
 *    - Custom monitoring
 *
 * 3. Expected responses:
 *    - 200: System healthy or degraded
 *    - 503: System unhealthy
 *
 * 4. Response format:
 *    {
 *      "status": "healthy" | "degraded" | "unhealthy",
 *      "timestamp": "2026-02-03T10:00:00Z",
 *      "checks": {
 *        "database": { "status": "up", "responseTime": 45 },
 *        "supabase": { "status": "up", "responseTime": 32 },
 *        "cometchat": { "status": "up", "responseTime": 120 },
 *        "memory": { "status": "ok", "value": 65, "threshold": 80, "unit": "percent" },
 *        "responseTime": 250
 *      },
 *      "version": "1.0.0"
 *    }
 */
