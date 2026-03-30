/**
 * CometChat Logger
 *
 * Logging utility for CometChat events and errors
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface CallEvent {
  type: 'call_initiated' | 'call_accepted' | 'call_rejected' | 'call_ended' | 'call_error' | 'call_updated' | 'call_incoming' | string;
  userId?: string;
  callId?: string;
  callType?: 'audio' | 'video';
  status?: string;
  duration?: number;
  error?: string;
  timestamp: string | Date;
  [key: string]: unknown;
}

interface MessageEvent {
  type: 'message_sent' | 'message_received' | 'message_error';
  userId: string;
  messageType: string;
  error?: string;
  timestamp: string;
}

class CometChatLogger {
  private prefix = '[CometChat]';
  private enabled = process.env.NODE_ENV !== 'production';

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logMessage = `${this.prefix} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'debug':
        console.debug(logMessage, data || '');
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
