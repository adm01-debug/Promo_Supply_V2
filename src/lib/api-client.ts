import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

/**
 * Advanced API Client wrapper for Supabase with resilience patterns.
 * Implements: Retries, Telemetry, and structured error handling.
 */

type ApiOptions = {
  retries?: number;
  silent?: boolean;
  context?: string;
};

export const apiClient = {
  /**
   * Execute a query with retry logic and telemetry
   */
  execute: async <T>(
    queryPromise: Promise<{ data: T | null; error: any }>,
    options: ApiOptions = {}
  ): Promise<T | null> => {
    const { retries = 3, silent = false, context = 'API' } = options;
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const { data, error } = await queryPromise;
        
        if (error) throw error;
        
        // Success telemetry
        if (attempt > 0) {
          logger.info(`[${context}] Sucesso após ${attempt} falhas`, { context });
        }
        
        return data;
      } catch (err: any) {
        attempt++;
        const isTransient = err.status === 408 || err.status === 429 || err.status >= 500;
        
        if (attempt >= retries || !isTransient) {
          if (!silent) {
            logger.error(`[${context}] Erro fatal na API após ${attempt} tentativas`, {
              error: err.message || err,
              status: err.status,
              context
            });
          }
          throw err;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`[${context}] Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`, {
          error: err.message,
          context
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  },

  /**
   * Wrapper for Supabase RPC calls
   */
  rpc: async <T>(fn: any, params?: any, options?: ApiOptions) => {
    return apiClient.execute<T>(supabase.rpc(fn, params) as any, { 
      ...options, 
      context: `RPC:${fn}` 
    });
  },

  /**
   * Wrapper for standard table queries
   */
  from: (table: any) => {
    const baseQuery = supabase.from(table);
    
    return {
      select: async <T>(query: string = '*', options?: ApiOptions) => {
        return apiClient.execute<T[]>(baseQuery.select(query) as any, {
          ...options,
          context: `SELECT:${table}`
        });
      },
    };
  }
};
