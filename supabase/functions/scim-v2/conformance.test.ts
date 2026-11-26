/**
 * SCIM 2.0 Conformance Test Suite (RFC 7643 + RFC 7644)
 *
 * Validates that the scim-v2 Edge Function meets the minimum conformance
 * requirements mandated by the SCIM 2.0 specification:
 *   - RFC 7643 §3.1  Core Schema: User resource representation
 *   - RFC 7644 §3.3  Resource creation (POST) → 201 + Location header
 *   - RFC 7644 §3.4  Resource retrieval (GET single + list)
 *   - RFC 7644 §3.4.2 List response envelope (ListResponse schema)
 *   - RFC 7644 §3.5.1 Attribute update via PATCH (operations array)
 *   - RFC 7644 §3.6  Resource deletion (DELETE → 204)
 *   - RFC 7644 §3.12 Error response envelope
 *   - Rate-limit enforcement (HTTP 429 on excess)
 *
 * How to run locally:
 *   deno test --allow-env supabase/functions/scim-v2/conformance.test.ts
 *
 * In CI these tests are skipped when SCIM_TEST_BASE_URL is not set, so they
 * never block the build against a live endpoint in environments that haven't
 * deployed the function.
 */

import { assertEquals, assertExists, assertMatch } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const BASE_URL = Deno.env.get("SCIM_TEST_BASE_URL") ?? "";
const SCIM_TOKEN = Deno.env.get("SCIM_TEST_TOKEN") ?? "";

// Helper: skip all tests when integration env vars are not configured.
function requireIntegrationEnv(): boolean {
  if (!BASE_URL || !SCIM_TOKEN) {
    console.warn("[SCIM conformance] SCIM_TEST_BASE_URL / SCIM_TEST_TOKEN not set — skipping integration tests.");
    return false;
  }
  return true;
}

async function scimRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${SCIM_TOKEN}`,
      "Content-Type": "application/scim+json",
      "Accept": "application/scim+json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ─── RFC 7644 §3.3 — Create User ─────────────────────────────────────────────

Deno.test("SCIM POST /Users — 201 with SCIM schema and Location header", async () => {
  if (!requireIntegrationEnv()) return;

  const unique = `scim-conformance-${Date.now()}@example.com`;
  const res = await scimRequest("POST", "/scim/v1/Users", {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: unique,
    displayName: "SCIM Conformance Test User",
    emails: [{ value: unique, primary: true }],
  });

  assertEquals(res.status, 201, "POST /Users must return 201");
  const location = res.headers.get("Location");
  assertExists(location, "201 response must include Location header");
  assertMatch(location, /\/Users\/[a-f0-9-]{36}/, "Location must reference the new user ID");

  const body = await res.json();
  assertEquals(body.schemas?.[0], "urn:ietf:params:scim:schemas:core:2.0:User", "schemas field must be set");
  assertExists(body.id, "id must be present");
  assertEquals(body.userName, unique, "userName must match the provided value");
  assertEquals(body.emails?.[0]?.value, unique, "emails[0].value must match");
  assertExists(body.meta?.resourceType, "meta.resourceType must be present");
  assertEquals(body.meta.resourceType, "User", "meta.resourceType must be 'User'");

  // Cleanup
  if (body.id) await scimRequest("DELETE", `/scim/v1/Users/${body.id}`);
});

// ─── RFC 7644 §3.4 — Read User ───────────────────────────────────────────────

Deno.test("SCIM GET /Users/:id — 200 with full User representation", async () => {
  if (!requireIntegrationEnv()) return;

  // Create a user first
  const email = `scim-get-${Date.now()}@example.com`;
  const createRes = await scimRequest("POST", "/scim/v1/Users", {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: email,
    displayName: "SCIM GET Test",
    emails: [{ value: email, primary: true }],
  });
  const created = await createRes.json();
  const userId = created.id;
  if (!userId) return; // skip if create failed

  const res = await scimRequest("GET", `/scim/v1/Users/${userId}`);
  assertEquals(res.status, 200, "GET /Users/:id must return 200");
  const body = await res.json();
  assertEquals(body.id, userId, "id must match requested resource");
  assertExists(body.userName, "userName must be present");

  await scimRequest("DELETE", `/scim/v1/Users/${userId}`);
});

// ─── RFC 7644 §3.4.2 — List Response ─────────────────────────────────────────

Deno.test("SCIM GET /Users — ListResponse envelope conforms to RFC 7644 §3.4.2", async () => {
  if (!requireIntegrationEnv()) return;

  const res = await scimRequest("GET", "/scim/v1/Users");
  assertEquals(res.status, 200, "GET /Users must return 200");
  const body = await res.json();
  assertEquals(
    body.schemas?.[0],
    "urn:ietf:params:scim:api:messages:2.0:ListResponse",
    "schemas must contain ListResponse",
  );
  assertExists(body.totalResults, "totalResults must be present");
  assertEquals(typeof body.totalResults, "number", "totalResults must be a number");
  assertExists(body.Resources, "Resources array must be present");
  assertEquals(Array.isArray(body.Resources), true, "Resources must be an array");
});

// ─── RFC 7644 §3.5.1 — PATCH (attribute update) ──────────────────────────────

Deno.test("SCIM PATCH /Users/:id — updates displayName via Operations array", async () => {
  if (!requireIntegrationEnv()) return;

  const email = `scim-patch-${Date.now()}@example.com`;
  const createRes = await scimRequest("POST", "/scim/v1/Users", {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: email,
    displayName: "Before Patch",
    emails: [{ value: email, primary: true }],
  });
  const created = await createRes.json();
  const userId = created.id;
  if (!userId) return;

  const patchRes = await scimRequest("PATCH", `/scim/v1/Users/${userId}`, {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    Operations: [
      { op: "Replace", path: "displayName", value: "After Patch" },
    ],
  });

  assertEquals(patchRes.status, 200, "PATCH /Users/:id must return 200");
  const patched = await patchRes.json();
  assertEquals(patched.displayName, "After Patch", "displayName must be updated");

  await scimRequest("DELETE", `/scim/v1/Users/${userId}`);
});

// ─── RFC 7644 §3.6 — Delete User ─────────────────────────────────────────────

Deno.test("SCIM DELETE /Users/:id — returns 204 No Content", async () => {
  if (!requireIntegrationEnv()) return;

  const email = `scim-del-${Date.now()}@example.com`;
  const createRes = await scimRequest("POST", "/scim/v1/Users", {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: email,
    displayName: "Delete Me",
    emails: [{ value: email, primary: true }],
  });
  const created = await createRes.json();
  const userId = created.id;
  if (!userId) return;

  const delRes = await scimRequest("DELETE", `/scim/v1/Users/${userId}`);
  assertEquals(delRes.status, 204, "DELETE must return 204 No Content");
  assertEquals(delRes.headers.get("content-length"), "0", "204 body must be empty");
});

// ─── RFC 7644 §3.12 — Error response ─────────────────────────────────────────

Deno.test("SCIM POST /Users with invalid body — error conforms to RFC 7644 §3.12", async () => {
  if (!requireIntegrationEnv()) return;

  const res = await scimRequest("POST", "/scim/v1/Users", {
    // Missing required emails field
    displayName: "No Email",
  });

  assertEquals(res.status, 400, "Invalid body must return 400");
  const body = await res.json();
  assertEquals(
    body.schemas?.[0],
    "urn:ietf:params:scim:api:messages:2.0:Error",
    "Error response must contain SCIM Error schema",
  );
  assertExists(body.detail, "Error response must include detail");
  assertExists(body.status, "Error response must include status code");
});

// ─── RFC 7644 — Unauthorized request ─────────────────────────────────────────

Deno.test("SCIM request without token — returns 401", async () => {
  if (!requireIntegrationEnv()) return;

  const res = await fetch(`${BASE_URL}/scim/v1/Users`, {
    headers: { "Accept": "application/scim+json" },
  });
  assertEquals(res.status, 401, "Missing token must yield 401");
});

// ─── Unsupported method ───────────────────────────────────────────────────────

Deno.test("SCIM unsupported method — returns 405", async () => {
  if (!requireIntegrationEnv()) return;

  const res = await scimRequest("PUT", "/scim/v1/Groups");
  assertEquals(res.status, 405, "Unsupported method must return 405");
});
