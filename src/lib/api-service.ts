import { logger } from "@/lib/logger";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export class BaseApiService {
  private static async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, cache: useCache = false } = options;
    
    const cacheKey = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
    
    if (useCache && method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.debug(`[API Cache] Hit: ${url}`);
        return cached.data;
      }
    }

    try {
      logger.debug(`[API Request] ${method} ${url}`);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (useCache && method === 'GET') {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      logger.error(`[API Error] ${method} ${url}:`, { error });
      throw error;
    }
  }

  static get<T>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  static post<T>(url: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }
}
