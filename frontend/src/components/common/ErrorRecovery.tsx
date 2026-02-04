/**
 * Error Recovery UI Components (T227)
 *
 * Reusable error recovery patterns for various failure scenarios
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCcw, WifiOff, Server, Database, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorRecoveryProps {
  error?: Error | null;
  errorType?: 'network' | 'server' | 'database' | 'validation' | 'generic';
  message?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
}

/**
 * Network Error Recovery
 * For fetch failures, timeout errors, offline scenarios
 */
export function NetworkErrorRecovery({
  error,
  message = 'Unable to connect to the server. Please check your internet connection.',
  onRetry,
  onCancel,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-lg border border-border-primary"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-4">
        <WifiOff className="w-8 h-8 text-warning" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">Connection Problem</h3>

      <p className="text-text-secondary text-center mb-6 max-w-md">{message}</p>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" aria-label="Retry connection">
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" aria-label="Cancel and go back">
            Cancel
          </Button>
        )}
      </div>

      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-bg-primary rounded text-xs w-full">
          <summary className="cursor-pointer text-text-secondary">Error Details</summary>
          <pre className="mt-2 text-error overflow-auto">{error.message}</pre>
        </details>
      )}
    </div>
  );
}

/**
 * Server Error Recovery
 * For 500 errors, API failures
 */
export function ServerErrorRecovery({
  error,
  message = 'The server encountered an error. Our team has been notified.',
  onRetry,
  onCancel,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-lg border border-border-primary"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-error/10 rounded-full mb-4">
        <Server className="w-8 h-8 text-error" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">Server Error</h3>

      <p className="text-text-secondary text-center mb-6 max-w-md">{message}</p>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" aria-label="Retry request">
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" aria-label="Go back">
            Go Back
          </Button>
        )}
      </div>

      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-bg-primary rounded text-xs w-full">
          <summary className="cursor-pointer text-text-secondary">Error Details</summary>
          <pre className="mt-2 text-error overflow-auto">{error.message}</pre>
        </details>
      )}
    </div>
  );
}

/**
 * Data Not Found Recovery
 * For 404 errors, missing resources
 */
export function DataNotFoundRecovery({
  message = 'The content you're looking for doesn't exist or has been removed.',
  onRetry,
  onCancel,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-lg border border-border-primary"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-info/10 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-info" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">Not Found</h3>

      <p className="text-text-secondary text-center mb-6 max-w-md">{message}</p>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" aria-label="Try again">
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Refresh
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="default" aria-label="Go back">
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Validation Error Recovery
 * For form validation failures, invalid input
 */
export function ValidationErrorRecovery({
  error,
  message = 'Please correct the errors in the form and try again.',
  onRetry,
  showDetails = true,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg"
    >
      <XCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />

      <div className="flex-1">
        <h4 className="font-semibold text-warning mb-1">Validation Error</h4>
        <p className="text-sm text-warning/90 mb-3">{message}</p>

        {showDetails && error && (
          <ul className="list-disc list-inside text-sm text-warning/80 space-y-1" role="list">
            <li>{error.message}</li>
          </ul>
        )}

        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline" className="mt-3">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Database Error Recovery
 * For database connection failures, query errors
 */
export function DatabaseErrorRecovery({
  error,
  message = 'Unable to access data. Please try again in a moment.',
  onRetry,
  onCancel,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-lg border border-border-primary"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-error/10 rounded-full mb-4">
        <Database className="w-8 h-8 text-error" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">Data Access Error</h3>

      <p className="text-text-secondary text-center mb-6 max-w-md">{message}</p>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" aria-label="Retry loading data">
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" aria-label="Cancel">
            Cancel
          </Button>
        )}
      </div>

      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-bg-primary rounded text-xs w-full">
          <summary className="cursor-pointer text-text-secondary">Error Details</summary>
          <pre className="mt-2 text-error overflow-auto">{error.message}</pre>
        </details>
      )}
    </div>
  );
}

/**
 * Generic Error Recovery
 * Fallback for unknown error types
 */
export function GenericErrorRecovery({
  error,
  message = 'Something went wrong. Please try again.',
  onRetry,
  onCancel,
}: ErrorRecoveryProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-lg border border-border-primary"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-error/10 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-error" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">An Error Occurred</h3>

      <p className="text-text-secondary text-center mb-6 max-w-md">{message}</p>

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="default" aria-label="Try again">
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" aria-label="Cancel">
            Cancel
          </Button>
        )}
      </div>

      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-3 bg-bg-primary rounded text-xs w-full">
          <summary className="cursor-pointer text-text-secondary">Error Details</summary>
          <pre className="mt-2 text-error overflow-auto">
            {error.message}
            {error.stack && `\n\nStack Trace:\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Smart Error Recovery Component
 * Automatically selects the appropriate recovery UI based on error type
 */
export function SmartErrorRecovery({
  error,
  errorType,
  message,
  onRetry,
  onCancel,
  showDetails,
}: ErrorRecoveryProps) {
  // Auto-detect error type if not provided
  const detectedType = errorType || detectErrorType(error);

  switch (detectedType) {
    case 'network':
      return (
        <NetworkErrorRecovery
          error={error}
          message={message}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      );
    case 'server':
      return (
        <ServerErrorRecovery
          error={error}
          message={message}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      );
    case 'database':
      return (
        <DatabaseErrorRecovery
          error={error}
          message={message}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      );
    case 'validation':
      return (
        <ValidationErrorRecovery
          error={error}
          message={message}
          onRetry={onRetry}
          showDetails={showDetails}
        />
      );
    default:
      return (
        <GenericErrorRecovery
          error={error}
          message={message}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      );
  }
}

/**
 * Helper: Detect error type from error object
 */
function detectErrorType(error?: Error | null): string {
  if (!error) return 'generic';

  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'network';
  }

  if (message.includes('server') || message.includes('500') || message.includes('503')) {
    return 'server';
  }

  if (message.includes('database') || message.includes('query') || message.includes('connection')) {
    return 'database';
  }

  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }

  return 'generic';
}

/**
 * Export all components
 */
export default SmartErrorRecovery;
