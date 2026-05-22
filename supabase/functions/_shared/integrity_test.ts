
import { FunctionContracts } from "./contracts.ts";
import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Integrity Test Suite for Edge Functions
 * Simulates invalid payloads and checks for consistent error responses.
 */
export async function runIntegrityTests(baseUrl: string, anonKey: string) {
  const results = [];

  for (const [fnName, schema] of Object.entries(FunctionContracts)) {
    console.log(`Testing integrity for: ${fnName}...`);
    
    // Test 1: Empty payload
    const resEmpty = await fetch(`${baseUrl}/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({})
    });

    const bodyEmpty = await resEmpty.json();
    const isStandardError = bodyEmpty.status === "error" && typeof bodyEmpty.requestId === "string";
    const isCorrectStatus = resEmpty.status === 400 || resEmpty.status === 401;

    results.push({
      function: fnName,
      test: "Empty Payload Rejection",
      passed: isStandardError && isCorrectStatus,
      status: resEmpty.status,
      response: bodyEmpty
    });

    // Test 2: Invalid Data Types
    const resInvalid = await fetch(`${baseUrl}/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ invalid_field: 123, action: "invalid_action_value" })
    });

    const bodyInvalid = await resInvalid.json();
    results.push({
      function: fnName,
      test: "Contract Violation Detection",
      passed: bodyInvalid.status === "error" && resInvalid.status === 400,
      status: resInvalid.status,
      response: bodyInvalid
    });
  }

  return results;
}
