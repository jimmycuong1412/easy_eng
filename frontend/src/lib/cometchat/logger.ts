/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CometChat Logger
 *
 * Logging utility for CometChat events and errors
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface CallEvent {
  type: string;
  [key: string]: any;
}

interface MessageEvent {
  type: 'message_sent' | 'message_received' | 'message_error';
  [key: string]: any;
}

class CometChatLogger {
  private prefix = '[CometChat]';
  private enabled = process.env.NODE_ENV !== 'production';

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.enabled) return;

    const logMessage = `${this.prefix} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'info':
        console.warn(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'debug':
        console.warn(logMessage, data || '');
        break;
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  logCallEvent(event: CallEvent) {
    this.info(`Call Event: ${event.type}`, {
      userId: event.userId,
      callType: event.callType,
      duration: event.duration,
      timestamp: event.timestamp,
    });

    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to analytics (Mixpanel, GA, etc.)
    }
  }

  logMessageEvent(event: MessageEvent) {
    this.debug(`Message Event: ${event.type}`, {
      userId: event.userId,
      messageType: event.messageType,
      timestamp: event.timestamp,
    });
  }

  logError(context: string, error: any) {
    this.error(`Error in ${context}:`, {
      message: error?.message || error,
      stack: error?.stack,
    });

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking (Sentry, etc.)
    }
  }
}

export const logger = new CometChatLogger();
