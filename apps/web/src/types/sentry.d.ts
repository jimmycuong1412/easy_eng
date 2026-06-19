/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@sentry/nextjs' {
  export function init(options: any): void;
  export function captureException(error: any, context?: any): string;
  export function captureMessage(message: string, level?: any): string;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export function startTransaction(context: any): any;
  export function withScope(callback: (scope: any) => void): void;
  export function configureScope(callback: (scope: any) => void): void;
  export function close(timeout?: number): Promise<boolean>;
  export function flush(timeout?: number): Promise<boolean>;

  export class BrowserTracing {
    constructor(options?: any);
  }

  export class Replay {
    constructor(options?: any);
  }

  export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

  export const Severity: {
    Fatal: string;
    Error: string;
    Warning: string;
    Log: string;
    Info: string;
    Debug: string;
  };
}
