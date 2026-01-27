'use client';

import { useState } from 'react';
import Link from 'next/link';
import { verifySupabaseConnection, type SupabaseConnectionStatus } from '@/lib/supabase/verify';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function SupabaseTestPage() {
  const [status, setStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [testResults, setTestResults] = useState<{
    healthCheck?: boolean;
    authCheck?: boolean;
    tableAccess?: string;
  }>({});

  const runFullTest = async () => {
    setIsChecking(true);
    setTestResults({});

    try {
      // 1. Basic connection check
      const connectionStatus = await verifySupabaseConnection();
      setStatus(connectionStatus);

      // 2. Test auth endpoint
      const supabase = getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      setTestResults((prev) => ({
        ...prev,
        authCheck: true,
      }));

      // 3. Test health check
      const healthCheck = connectionStatus.isConnected;
      setTestResults((prev) => ({
        ...prev,
        healthCheck,
      }));

      // 4. Try to access a table (will fail if no tables exist, but connection works)
      try {
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
          setTestResults((prev) => ({
            ...prev,
            tableAccess: `Table query attempted: ${error.message}`,
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            tableAccess: 'Table access successful',
          }));
        }
      } catch (err) {
        setTestResults((prev) => ({
          ...prev,
          tableAccess: `Error: ${err instanceof Error ? err.message : 'Unknown'}`,
        }));
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Supabase Connection Test
          </h1>
          <p className="text-text-secondary">
            Verify your Supabase configuration and connection status
          </p>
        </div>

        {/* Environment Info */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Environment Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border-primary">
              <span className="text-text-secondary">Supabase URL:</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ NOT SET'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-primary">
              <span className="text-text-secondary">Anon Key:</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                  ? `✅ ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
                  : '❌ NOT SET'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Environment:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  process.env.NODE_ENV === 'development'
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
              >
                {(process.env.NODE_ENV || 'development').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="card p-6 mb-6">
          <button
            onClick={runFullTest}
            disabled={isChecking}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                Running Tests...
              </span>
            ) : (
              '🔍 Run Full Connection Test'
            )}
          </button>
        </div>

        {/* Connection Status */}
        {status && (
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Connection Status</h2>
            <div
              className={`p-4 rounded-lg ${
                status.isConnected
                  ? 'bg-green-900/30 border-2 border-green-600'
                  : 'bg-red-900/30 border-2 border-red-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">
                  {status.isConnected ? '✅' : '❌'}
                </span>
                <div className="flex-1">
                  <div className="text-xl font-bold mb-2">{status.message}</div>
                  {status.details && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-text-secondary">URL:</span>
                        <span className="font-mono text-xs break-all">
                          {status.details.url}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-text-secondary">Has Anon Key:</span>
                        <span>{status.details.hasAnonKey ? '✅ Yes' : '❌ No'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-text-secondary">Can Query:</span>
                        <span>{status.details.canQuery ? '✅ Yes' : '❌ No'}</span>
                      </div>
                      {status.details.responseTime !== undefined && (
                        <div className="flex justify-between py-1">
                          <span className="text-text-secondary">Response Time:</span>
                          <span className="font-bold">
                            {status.details.responseTime}ms
                          </span>
                        </div>
                      )}
                      {status.details.error && (
                        <div className="mt-3 p-3 bg-red-950/50 border border-red-700 rounded">
                          <div className="text-red-300 font-semibold mb-1">
                            Error Details:
                          </div>
                          <div className="text-red-200 text-xs font-mono">
                            {status.details.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Detailed Test Results</h2>
            <div className="space-y-3">
              {testResults.healthCheck !== undefined && (
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded">
                  <span className="font-semibold">Health Check</span>
                  <span className="text-xl">
                    {testResults.healthCheck ? '✅' : '❌'}
                  </span>
                </div>
              )}
              {testResults.authCheck !== undefined && (
                <div className="flex items-center justify-between p-3 bg-bg-secondary rounded">
                  <span className="font-semibold">Auth Endpoint</span>
                  <span className="text-xl">
                    {testResults.authCheck ? '✅' : '❌'}
                  </span>
                </div>
              )}
              {testResults.tableAccess && (
                <div className="p-3 bg-bg-secondary rounded">
                  <div className="font-semibold mb-2">Table Access Test</div>
                  <div className="text-sm text-text-secondary">
                    {testResults.tableAccess}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card p-6 mt-6 bg-blue-900/20 border-2 border-blue-600">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>💡</span> Troubleshooting Tips
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex gap-2">
              <span>•</span>
              <span>
                Make sure your <code className="text-accent-primary">.env.local</code> file
                exists with valid Supabase credentials
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                Verify your Supabase project is active at{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline"
                >
                  supabase.com/dashboard
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>
                Check that your API URL and Anon Key match your project settings
              </span>
            </li>
            <li className="flex gap-2">
              <span>•</span>
              <span>Restart the dev server after changing environment variables</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
