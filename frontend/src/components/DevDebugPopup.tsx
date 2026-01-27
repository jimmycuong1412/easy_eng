'use client';

import { useState, useEffect } from 'react';
import { verifySupabaseConnection, type SupabaseConnectionStatus } from '@/lib/supabase/verify';

interface DebugInfo {
  page: string;
  viewport: { width: number; height: number };
  userAgent: string;
  timestamp: string;
  environment: string;
}

export default function DevDebugPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    page: '',
    viewport: { width: 0, height: 0 },
    userAgent: '',
    timestamp: '',
    environment: process.env.NODE_ENV || 'development',
  });

  // Update debug info
  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        page: window.location.pathname,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        userAgent: navigator.userAgent,
        timestamp: new Date().toLocaleString('vi-VN'),
        environment: process.env.NODE_ENV || 'development',
      });
    };

    updateDebugInfo();
    window.addEventListener('resize', updateDebugInfo);
    
    return () => window.removeEventListener('resize', updateDebugInfo);
  }, []);

  // Keyboard shortcut: Ctrl + Shift + D to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check Supabase connection when popup opens
  useEffect(() => {
    if (isOpen && !supabaseStatus) {
      checkSupabaseConnection();
    }
  }, [isOpen]);

  // Function to check Supabase connection
  const checkSupabaseConnection = async () => {
    setIsCheckingSupabase(true);
    try {
      const status = await verifySupabaseConnection();
      setSupabaseStatus(status);
    } catch (error) {
      setSupabaseStatus({
        isConnected: false,
        message: 'Failed to verify connection',
        details: {
          url: 'ERROR',
          hasAnonKey: false,
          canQuery: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] bg-red-600 hover:bg-red-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
        title="Debug Panel (Ctrl+Shift+D)"
      >
        🐛
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] bg-gray-900 border-2 border-red-500 rounded-lg shadow-2xl w-96 max-h-[600px] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-red-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐛</span>
              <h3 className="font-bold">Debug Panel</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-red-700 rounded px-2 py-1 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 text-sm text-gray-100">
            {/* Environment */}
            <div>
              <div className="text-red-400 font-semibold mb-1">Environment:</div>
              <div className="bg-gray-800 px-3 py-2 rounded">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    debugInfo.environment === 'development'
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                  }`}
                >
                  {debugInfo.environment.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Current Page */}
            <div>
              <div className="text-red-400 font-semibold mb-1">Current Page:</div>
              <div className="bg-gray-800 px-3 py-2 rounded font-mono break-all">
                {debugInfo.page || '/'}
              </div>
            </div>

            {/* Viewport */}
            <div>
              <div className="text-red-400 font-semibold mb-1">Viewport:</div>
              <div className="bg-gray-800 px-3 py-2 rounded">
                {debugInfo.viewport.width} × {debugInfo.viewport.height}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <div className="text-red-400 font-semibold mb-1">Timestamp:</div>
              <div className="bg-gray-800 px-3 py-2 rounded">
                {debugInfo.timestamp}
              </div>
            </div>

            {/* User Agent */}
            <div>
              <div className="text-red-400 font-semibold mb-1">User Agent:</div>
              <div className="bg-gray-800 px-3 py-2 rounded text-xs break-all">
                {debugInfo.userAgent}
              </div>
            </div>

            {/* Supabase Connection Status */}
            <div className="pt-2 border-t border-gray-700">
              <div className="text-red-400 font-semibold mb-2">Supabase Connection:</div>
              {isCheckingSupabase ? (
                <div className="bg-gray-800 px-3 py-2 rounded text-center">
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <div className="mt-2 text-sm">Checking connection...</div>
                </div>
              ) : supabaseStatus ? (
                <div className="space-y-2">
                  <div
                    className={`px-3 py-2 rounded flex items-center gap-2 ${
                      supabaseStatus.isConnected
                        ? 'bg-green-900/30 border border-green-600'
                        : 'bg-red-900/30 border border-red-600'
                    }`}
                  >
                    <span className="text-xl">
                      {supabaseStatus.isConnected ? '✅' : '❌'}
                    </span>
                    <div>
                      <div className="font-semibold">{supabaseStatus.message}</div>
                      {supabaseStatus.details && (
                        <div className="text-xs mt-1 space-y-1">
                          <div>URL: {supabaseStatus.details.url}</div>
                          <div>
                            Anon Key:{' '}
                            {supabaseStatus.details.hasAnonKey ? '✓ Set' : '✗ Missing'}
                          </div>
                          {supabaseStatus.details.responseTime !== undefined && (
                            <div>Response: {supabaseStatus.details.responseTime}ms</div>
                          )}
                          {supabaseStatus.details.error && (
                            <div className="text-red-300 mt-1">
                              Error: {supabaseStatus.details.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={checkSupabaseConnection}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors text-sm"
                  >
                    🔄 Recheck Connection
                  </button>
                </div>
              ) : (
                <button
                  onClick={checkSupabaseConnection}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors"
                >
                  🔍 Check Supabase Connection
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <div className="text-red-400 font-semibold mb-2">Quick Actions:</div>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors"
                >
                  🔄 Reload Page
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert('Storage cleared!');
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded transition-colors"
                >
                  🗑️ Clear Storage
                </button>
                <button
                  onClick={() => {
                    console.log('Debug Info:', debugInfo);
                    alert('Check console for debug info');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded transition-colors"
                >
                  📋 Log to Console
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-xs">
                <strong>Keyboard Shortcut:</strong> Ctrl + Shift + D
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
