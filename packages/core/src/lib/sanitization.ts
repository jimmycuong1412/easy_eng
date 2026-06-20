/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Input Sanitization Utilities (T238)
 *
 * Sanitizes user input to prevent XSS, SQL injection, and other attacks
 * All user input should be sanitized before use or storage
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes potentially dangerous tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove dangerous tags
  const dangerousTags = [
    'iframe',
    'object',
    'embed',
    'applet',
    'meta',
    'link',
    'style',
    'form',
    'input',
    'button',
    'textarea',
    'select',
  ];

  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
  });

  return sanitized;
}

/**
 * Sanitize plain text input
 * Escapes HTML entities to prevent XSS
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }

  // Only allow http, https, mailto, tel
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('mailto:') &&
    !trimmed.startsWith('tel:') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('#')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitize email address
 * Validates and normalizes email format
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Sanitize phone number
 * Removes non-numeric characters except + for country code
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-numeric except + at the start
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (sanitized.includes('+')) {
    return '+' + sanitized.replace(/\+/g, '');
  }

  return sanitized;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  // Remove path traversal sequences
  let sanitized = filename.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 250) + (ext ? `.${ext}` : '');
  }

  return sanitized;
}

/**
 * Sanitize search query
 * Removes SQL injection patterns and special characters
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  // Remove SQL keywords and patterns
  let sanitized = query.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi, '');

  // Remove special SQL characters
  sanitized = sanitized.replace(/[;'"\\]/g, '');

  // Trim and limit length
  sanitized = sanitized.trim();
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return sanitized;
}

/**
 * Sanitize integer input
 * Ensures value is a valid integer
 */
export function sanitizeInt(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Sanitize float input
 * Ensures value is a valid float
 */
export function sanitizeFloat(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Sanitize boolean input
 * Converts various truthy/falsy values to boolean
 */
export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
}

/**
 * Sanitize JSON input
 * Validates and parses JSON safely
 */
export function sanitizeJson<T = any>(input: string): T | null {
  if (!input) return null;

  try {
    const parsed = JSON.parse(input);
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Sanitize object by sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  textFields: (keyof T)[] = []
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      // Apply text sanitization to specified fields
      if (textFields.includes(key)) {
        sanitized[key] = sanitizeText(value) as any;
      } else {
        // Default to HTML sanitization
        sanitized[key] = sanitizeHtml(value) as any;
      }
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize UUID
 */
export function sanitizeUuid(uuid: string): string | null {
  if (!uuid) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return null;
  }

  return uuid.toLowerCase();
}

/**
 * Sanitize array of values
 */
export function sanitizeArray<T>(
  array: any[],
  sanitizer: (value: any) => T
): T[] {
  if (!Array.isArray(array)) return [];

  return array
    .map(sanitizer)
    .filter((value) => value !== null && value !== undefined);
}

/**
 * Sanitize user input for display
 * Escapes HTML but preserves safe formatting
 */
export function sanitizeUserContent(content: string): string {
  if (!content) return '';

  // First escape HTML entities
  let sanitized = sanitizeText(content);

  // Then convert newlines to <br> for display
  sanitized = sanitized.replace(/\n/g, '<br>');

  return sanitized;
}

/**
 * Remove zero-width characters and other invisible Unicode
 * These can be used for text direction attacks
 */
export function removeInvisibleCharacters(text: string): string {
  if (!text) return '';

  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u202A-\u202E]/g, '') // Text direction marks
    .replace(/[\u2066-\u2069]/g, ''); // Isolate marks
}

/**
 * Comprehensive input sanitization for forms
 * Applies multiple sanitization techniques
 */
export function sanitizeFormInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove invisible characters
  sanitized = removeInvisibleCharacters(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Sanitize HTML
  sanitized = sanitizeHtml(sanitized);

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Type guard to check if value is string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Sanitization middleware for API requests
 */
export class InputSanitizer {
  /**
   * Sanitize request body
   */
  static sanitizeBody<T extends Record<string, any>>(
    body: T,
    schema: {
      [K in keyof T]?: 'text' | 'html' | 'email' | 'url' | 'int' | 'float' | 'boolean' | 'uuid' | 'phone';
    }
  ): Partial<T> {
    const sanitized: Partial<T> = {};

    for (const key in schema) {
      const value = body[key];
      const type = schema[key];

      if (value === undefined || value === null) {
        continue;
      }

      switch (type) {
        case 'text':
          sanitized[key] = sanitizeText(String(value)) as any;
          break;
        case 'html':
          sanitized[key] = sanitizeHtml(String(value)) as any;
          break;
        case 'email':
          sanitized[key] = sanitizeEmail(String(value)) as any;
          break;
        case 'url':
          sanitized[key] = sanitizeUrl(String(value)) as any;
          break;
        case 'int':
          sanitized[key] = sanitizeInt(value) as any;
          break;
        case 'float':
          sanitized[key] = sanitizeFloat(value) as any;
          break;
        case 'boolean':
          sanitized[key] = sanitizeBoolean(value) as any;
          break;
        case 'uuid':
          sanitized[key] = sanitizeUuid(String(value)) as any;
          break;
        case 'phone':
          sanitized[key] = sanitizePhone(String(value)) as any;
          break;
        default:
          sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
