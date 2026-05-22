import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Fuzzing Engine for Edge Functions.
 * Generates malformed payloads from schemas to test resilience.
 */
export class PayloadFuzzer {
  static generateMutations(schema: any, validBase: any): any[] {
    const mutations: any[] = [];
    
    // Support Discriminated Unions and regular Objects
    const shape = schema instanceof z.ZodObject ? schema.shape : (schema._def?.options?.[0]?.shape || schema._def?.shape || {});
    const keys = Object.keys(shape);

    // 1. Missing required fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      delete mutation[key];
      mutations.push({ type: `missing_${key}`, payload: mutation });
    });

    // 2. Wrong types for fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      const currentShape = shape[key];
      if (!currentShape) return;

      mutation[key] = typeof validBase[key] === 'string' ? 123 : "wrong_type";
      mutations.push({ type: `wrong_type_${key}`, payload: mutation });
    });

    // 3. Null values for non-nullable fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      mutation[key] = null;
      mutations.push({ type: `null_${key}`, payload: mutation });
    });

    return mutations;
  }
}
