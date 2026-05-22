
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
        'Authorization': `Bearer ${anonKey}`,
        'x-request-id': `test-empty-${fnName}`
      },
      body: JSON.stringify({})
    });

    let bodyEmpty;
    try {
      bodyEmpty = await resEmpty.json();
    } catch (e) {
      bodyEmpty = { error: "Non-JSON response" };
    }

    const isStandardError = bodyEmpty.status === "error" && typeof bodyEmpty.requestId === "string";
    const isCorrectStatus = resEmpty.status === 400 || resEmpty.status === 401 || resEmpty.status === 403;

    results.push({
      function: fnName,
      test: "Empty Payload Rejection",
      passed: isStandardError && isCorrectStatus,
      status: resEmpty.status,
      response: bodyEmpty
    });

    // Test 2: Invalid Data Types (Fuzzing)
    const resInvalid = await fetch(`${baseUrl}/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'x-request-id': `test-invalid-${fnName}`
      },
      body: JSON.stringify({ 
        invalid_field: 123, 
        action: "invalid_action_value",
        payload: "should_be_object_or_array_depending_on_contract" 
      })
    });

    let bodyInvalid;
    try {
      bodyInvalid = await resInvalid.json();
    } catch (e) {
      bodyInvalid = { error: "Non-JSON response" };
    }

    results.push({
      function: fnName,
      test: "Contract Violation Detection",
      passed: bodyInvalid.status === "error" && (resInvalid.status === 400 || resInvalid.status === 401 || resInvalid.status === 403),
      status: resInvalid.status,
      response: bodyInvalid
    });

    // Test 3: Multi-tenant Isolation (Missing x-tenant-id for sensitive functions)
    const resIsolation = await fetch(`${baseUrl}/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ action: "query" }) // Generic action to trigger check
    });

    const bodyIsolation = await resIsolation.json().catch(() => ({}));
    
    results.push({
      function: fnName,
      test: "Isolation Headers Enforcement",
      passed: resIsolation.status !== 200 || (bodyIsolation.status === "error"),
      status: resIsolation.status
    });
  }

  return results;
}
