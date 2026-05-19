import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Fuzzing Engine for Edge Functions.
 * Generates malformed payloads from Zod schemas to test resilience.
 */
export class PayloadFuzzer {
  /**
   * Generates a variety of malformed payloads based on a Zod schema.
   */
  static generateMutations(schema: z.ZodObject<any>, validBase: any): any[] {
    const mutations: any[] = [];
    const keys = Object.keys(schema.shape);

    // 1. Missing required fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      delete mutation[key];
      mutations.push({ type: `missing_${key}`, payload: mutation });
    });

    // 2. Wrong types for fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      mutation[key] = typeof validBase[key] === 'string' ? 123 : "wrong_type";
      mutations.push({ type: `wrong_type_${key}`, payload: mutation });
    });

    // 3. Invalid UUIDs (if field is uuid)
    keys.forEach(key => {
      const shape = schema.shape[key];
      // Check if it's a ZodString with UUID check (approximated here)
      if (typeof validBase[key] === 'string' && validBase[key].length > 20) {
        const mutation = { ...validBase };
        mutation[key] = "not-a-valid-uuid-12345";
        mutations.push({ type: `invalid_uuid_${key}`, payload: mutation });
      }
    });

    // 4. Null values for non-nullable fields
    keys.forEach(key => {
      const mutation = { ...validBase };
      mutation[key] = null;
      mutations.push({ type: `null_${key}`, payload: mutation });
    });

    return mutations;
  }
}
