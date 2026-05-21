import DOMPurify from 'dompurify';
import { logger } from './logger';

/**
 * Security utility for the application.
 * Handles sanitization, security validation and audit logging.
 */

export const security = {
  /**
   * Sanitizes a string of HTML to prevent XSS.
   */
  sanitize: (html: string): string => {
    if (!html) return '';
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
    
    if (html !== clean) {
      logger.warn('Potencial tentativa de XSS detectada e sanitizada', {
        originalLength: html.length,
        sanitizedLength: clean.length
      });
    }
    
    return clean;
  },

  /**
   * Sanitiza um termo de busca antes de interpolar em filtros PostgREST `.or()`.
   * Remove os caracteres estruturais do PostgREST (`,` `(` `)`) que quebram o
   * parse do filtro e permitem injetar condições extras, e os curingas SQL
   * (`%` `_` `*`) para que sejam tratados como texto literal no `ilike`.
   */
  sanitizeSearchTerm: (term: string): string => {
    if (!term) return '';
    return term
      .replace(/[,()]/g, ' ')      // delimitadores estruturais do PostgREST
      .replace(/[%_*\\]/g, '')      // curingas SQL/PostgREST
      .trim()
      .slice(0, 100);
  },

  /**
   * Validates if a string is a potentially dangerous pattern.
   */
  isDangerous: (text: string): boolean => {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      /eval\(/i,
      /SQL\s+INJECTION/i
    ];
    return dangerousPatterns.some(pattern => pattern.test(text));
  },

  /**
   * Generates a security audit log entry.
   */
  auditLog: (action: string, metadata?: Record<string, unknown>) => {
    logger.info(`SECURITY_AUDIT: ${action}`, {
      ...metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }
};
