---
name: api-design-guide
description: Canonical enterprise API design standards and engineering playbook. Covers REST resource modeling, HTTP semantics, schema definitions, idempotency, pagination, concurrency control, auth/authz boundaries, async job flows, versioning, deprecation, and design-time quality checklists.
triggers:
  - api-design
  - rest-api
  - endpoint-design
  - api-schema
  - url-design
  - http-semantics
  - api-conventions
---

# Enterprise API Design Guide & Standards

## 0. PURPOSE & ARCHITECTURAL BOUNDARY

You are an **API Architect and Systems Designer**.

An API contract is a **strict boundary and public commitment** between decoupled systems, not merely an internal routing layer. When designing new endpoints or evolving existing services, every endpoint must be designed to be:
* **Semantically Correct**: Adhering to RFC standards for HTTP verbs, headers, and status codes.
* **Deterministic & Predictable**: Consistent naming, casing, error contracts, and behavior across all resources.
* **Secure by Design**: Enforcing authentication, authorization, ownership boundaries, and input sanitization at ingress.
* **Backward-Compatible**: Additive evolution preventing broken clients and forced upgrades.
* **Explicitly Documented**: Fully specifiable in OpenAPI 3.0/3.1 without ambiguity.

Every endpoint contract encompasses the entire request/response lifecycle:
```text
Request Ingress
  ├── TLS & Security Headers
  ├── Authentication & Principal Resolution
  ├── Authorization & Tenant / Resource Scope Check
  ├── Transport Validation & Sanitization
  ├── Domain Logic & State Transition
  ├── Idempotency & Concurrency Guards
  ├── Data Persistence / External Dispatch
  └── Response Generation
       ├── Success / Problem Details Formatting
       ├── Cache & Conditional Headers
       └── Structured Audit Logging & Tracing
```

---

## 1. RESOURCE MODELING & URL DESIGN

Prefer resource-oriented paths structured as collections and subordinate items. Model resources as nouns; model genuine domain commands as explicit actions.

### 1.1 Resource URI Conventions
```http
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{workspace_id}
PATCH  /api/v1/workspaces/{workspace_id}
DELETE /api/v1/workspaces/{workspace_id}
```

### 1.2 Hierarchy & Nesting Limit
* Avoid nesting beyond **two levels** deep. Deep hierarchies introduce tight coupling and unwieldy URLs.
* Prefer top-level resources with query filters over deep nesting when subordinate resources have independent lifecycles.

```http
# Acceptable (depth <= 2)
GET /api/v1/organizations/{org_id}/teams/{team_id}

# Anti-Pattern (excessive nesting)
GET /api/v1/orgs/{org_id}/teams/{team_id}/projects/{project_id}/tasks/{task_id}

# Corrected Alternative (root resource with reference filtering)
GET /api/v1/tasks/{task_id}
GET /api/v1/tasks?project_id={project_id}&team_id={team_id}
```

### 1.3 Modeling Actions & Domain Commands
Do not force artificial CRUD/REST abstractions onto actions that represent discrete state transitions or commands. Use explicit POST action endpoints:

```http
# Explicit Domain Actions
POST /api/v1/deployments/{id}/rollback
POST /api/v1/orders/{order_id}/cancel
POST /api/v1/invoices/{invoice_id}/void
POST /api/v1/pipelines/{id}/trigger
```

---

## 2. URL CONSISTENCY & CASING STANDARDS

All APIs in a service ecosystem must adhere to uniform syntactic rules:

| Element | Convention | Example |
| :--- | :--- | :--- |
| **Path Segments** | `kebab-case`, plural nouns | `/api/v1/user-profiles`, `/api/v1/build-jobs` |
| **Path Parameters** | `snake_case`, explicit ID name | `{workspace_id}`, `{task_id}` (never bare `{id}`) |
| **Query Parameters**| `snake_case` | `?page_size=20&sort_by=-created_at` |
| **JSON Field Names**| `camelCase` or `snake_case` (Consistent per project) | `{"assignedUserId": "..."}` or `{"assigned_user_id": "..."}` |
| **HTTP Headers**    | `Header-Case` / `kebab-case` | `X-Request-Id`, `Idempotency-Key` |

* **Zero Mixed Conventions**: Never mix `snake_case` and `camelCase` within the same endpoint or schema without an established migration adapter.
* **Explicit Parameter Names**: Never use generic `{id}` when routing nested resources. Use `{project_id}` and `{task_id}` to prevent parameter shadowing.

---

## 3. HTTP METHOD SEMANTICS

| Method | Safe | Idempotent | Request Body | Primary Use Case | Expected Status |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **GET** | Yes | Yes | No | Read/query resource representation. Must have no state mutations. | `200 OK` |
| **POST** | No | No* | Yes | Create subordinate resources, execute domain commands, dispatch jobs. | `201 Created`, `202 Accepted`, `200 OK` |
| **PUT** | No | Yes | Yes | Complete resource replacement. Replaces entire representation. | `200 OK`, `204 No Content` |
| **PATCH** | No | No* | Yes | Partial resource update. Modifies specified delta fields. | `200 OK`, `204 No Content` |
| **DELETE**| No | Yes | Optional | Remove resource or trigger deletion lifecycle. | `204 No Content`, `202 Accepted` |

*\*Idempotency can be guaranteed via explicit `Idempotency-Key`.*

---

## 4. HTTP STATUS CODES SPECIFICATION

Use status codes strictly according to their RFC definitions:

### 4.1 Success (2xx)
* `200 OK`: Request succeeded. Response body contains requested representation or operation summary.
* `201 Created`: Resource successfully created. Must return the created entity or its identifier, and should include:
  ```http
  Location: /api/v1/workspaces/ws_98765
  ```
* `202 Accepted`: Request accepted for asynchronous processing. Must return a task/job tracking handle.
* `204 No Content`: Request succeeded with zero response body (e.g., successful `DELETE` or state action).

### 4.2 Client Errors (4xx)
* `400 Bad Request`: Syntactically invalid request (malformed JSON, unparseable headers).
* `401 Unauthorized`: Authentication is missing, expired, or invalid.
* `403 Forbidden`: Authentication is valid, but the principal lacks permissions for this resource or operation.
* `404 Not Found`: Target resource does not exist (or concealed for security/authorization reasons).
* `409 Conflict`: Request conflicts with current resource state (duplicate key, version conflict, illegal FSM state transition).
* `412 Precondition Failed`: Precondition specified in request headers (`If-Match`, `If-Unmodified-Since`) failed.
* `422 Unprocessable Content`: Syntactically valid request fails semantic/domain validation rules.
* `429 Too Many Requests`: Client exceeded rate limit quotas. Must provide `Retry-After` header.

### 4.3 Server Errors (5xx)
* `500 Internal Server Error`: Unhandled server exception. Never expose raw stack traces, DB queries, or internal paths.
* `502 Bad Gateway`: Upstream dependency returned an invalid or unparseable response.
* `503 Service Unavailable`: Server or critical dependency temporarily overloaded. Should include `Retry-After`.
* `504 Gateway Timeout`: Upstream dependency timed out within SLA boundaries.

---

## 5. MACHINE-READABLE ERROR CONTRACTS (RFC 7807)

Every client and server error response must adhere to a standardized, machine-readable Problem Details payload:

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "code": "FIELD_VALIDATION_ERROR",
  "detail": "One or more fields failed validation requirements.",
  "instance": "/api/v1/workspaces",
  "requestId": "req_01HPX789ABCD",
  "errors": [
    {
      "field": "budgetLimit",
      "code": "MIN_VALUE_EXCEEDED",
      "message": "budgetLimit must be greater than or equal to 0.",
      "rejectedValue": -50.0
    }
  ]
}
```

### Error Design Invariants:
1. **Never parse human messages**: Clients must branch programmatically on `code`, never on `title` or `detail`.
2. **Deterministic error codes**: Use uppercase snake-case string enums (e.g., `WORKSPACE_ALREADY_EXISTS`, `INSUFFICIENT_PERMISSIONS`).
3. **Always attach correlation ID**: `requestId` must match the `X-Request-Id` response header.

---

## 6. REQUEST & RESPONSE SCHEMA MODELING

1. **Explicit Data Transfer Objects (DTOs)**:
   * Decouple API contracts from internal database/ORM models.
   * Never leak database implementation details (e.g., auto-increment sequential integer IDs, password hashes, internal foreign keys).
2. **Uniform Response Envelopes**:
   * Standardize across the service. If direct representations are chosen, use them everywhere. If enveloped (`data`, `meta`), enforce globally:
   ```json
   {
     "data": {
       "id": "ws_12345",
       "name": "Production Cluster",
       "createdAt": "2026-09-26T08:00:00Z"
     },
     "meta": {
       "serverTime": "2026-09-26T08:00:01Z"
     }
   }
   ```
3. **Nullability & Default Values**:
   * Every schema must explicitly declare whether fields are nullable or omitted when empty.
   * Prefer omitting absent fields or returning explicit `null`, but stay consistent.

---

## 7. PAGINATION, FILTERING, SORTING & SEARCH

Unbounded collection responses are strictly forbidden.

### 7.1 Cursor-Based Pagination (Recommended for dynamic/high-volume data)
```http
GET /api/v1/audit-events?limit=50&cursor=eyJjcmVhdGVkX2F0IjoxNzAwfQ
```
Response:
```json
{
  "data": [ ... ],
  "pagination": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkX2F0IjoxNzUwLCJpZCI6MTIzfQ"
  }
}
```

### 7.2 Keyset / Offset Pagination (Acceptable for stable catalog data)
* Always enforce a hard `max_limit` (e.g., 100) even if the client requests more.
* Enforce stable sorting by tying ordering to a unique tie-breaker column (e.g., `ORDER BY created_at DESC, id DESC`).

### 7.3 Filtering and Sorting Whitelists
* Define an explicit whitelist of filterable and sortable fields.
* Never map query parameters directly into SQL `WHERE` clauses or ORM dynamic lookups.
```http
# Prefix with '-' or specify direction for descending sort
GET /api/v1/tasks?status=in_progress&priority=high&sort=-due_date
```

---

## 8. CONCURRENCY CONTROL & OPTIMISTIC LOCKING

For stateful resources subject to concurrent updates, implement optimistic locking to prevent lost updates:

```http
# Step 1: Client retrieves resource representation with ETag
GET /api/v1/workspaces/ws_123
HTTP/1.1 200 OK
ETag: "w_v4_7f8a9b"

# Step 2: Client submits update with condition
PATCH /api/v1/workspaces/ws_123
If-Match: "w_v4_7f8a9b"
Content-Type: application/json

{ "name": "Renamed Workspace" }

# Outcome A: Success (version matches)
HTTP/1.1 200 OK
ETag: "w_v5_0c1b2d"

# Outcome B: Conflict (resource modified by another actor)
HTTP/1.1 412 Precondition Failed
```

---

## 9. IDEMPOTENCY SPECIFICATION

All non-safe state-mutating operations (`POST`, non-idempotent `PATCH`) where client retries may occur (payments, orders, job submissions) must support idempotency keys:

1. **Header**: `Idempotency-Key: <uuid-v4-or-client-token>`
2. **TTL**: Keys must be stored in distributed cache (e.g., Redis) with an expiration (minimum 24 hours).
3. **Execution Semantics**:
   * *In-Flight*: If a second request arrives while the first is processing, return `409 Conflict` with code `OPERATION_IN_PROGRESS`.
   * *Completed*: If a second request arrives with identical key and payload, return the cached original response code and body.
   * *Payload Mismatch*: If the key matches an existing key but payload differs, return `422 Unprocessable Content` with code `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`.

---

## 10. AUTHENTICATION, AUTHORIZATION & SCOPE BOUNDARIES

1. **Transport Boundary**:
   * Authentication credentials (bearer tokens, API keys) must be passed exclusively in headers (`Authorization: Bearer <token>`).
   * Never accept credentials in query parameters or URL paths.
2. **Object-Level Authorization (BOLA / IDOR Prevention)**:
   * Verify that the authenticated principal has direct ownership or explicit role access to the targeted resource ID.
   * In multi-tenant environments, resolve the `tenant_id` from the authenticated token context, never from client-provided body or query parameters alone.
3. **Information Concealment**:
   * When an unauthorized user probes an object ID that belongs to another tenant, return `404 Not Found` rather than `403 Forbidden` to prevent object enumeration.

---

## 11. ASYNCHRONOUS OPERATIONS & LONG-RUNNING TASKS

When an operation exceeds standard HTTP timeouts (>2-5 seconds), do not block the connection. Decouple via the Async Job pattern:

```http
# 1. Dispatch Operation
POST /api/v1/reports/export
HTTP/1.1 202 Accepted
Location: /api/v1/jobs/job_998877
Retry-After: 10

{
  "jobId": "job_998877",
  "status": "QUEUED",
  "createdAt": "2026-09-26T08:30:00Z"
}

# 2. Poll Status
GET /api/v1/jobs/job_998877
HTTP/1.1 200 OK

{
  "jobId": "job_998877",
  "status": "COMPLETED",
  "progressPercentage": 100,
  "resultUrl": "/api/v1/reports/downloads/rep_112233"
}
```

---

## 12. VERSIONING & EVOLUTION SAFETY

1. **URI Versioning**: Use explicit major version prefix in the URL path (`/api/v1/`, `/api/v2/`).
2. **Additive Changes Rule**: Add new fields, optional parameters, and new endpoints without incrementing major version:
   * Adding optional request parameters: **Safe**
   * Adding fields to response payload: **Safe**
   * Removing or renaming fields in responses: **Breaking**
   * Changing field types or validation constraints (e.g. string to int, shortening max-length): **Breaking**
   * Changing HTTP status codes: **Breaking**
3. **Deprecation Headers**:
   ```http
   Deprecation: @1774569600
   Sunset: Wed, 26 Sep 2027 00:00:00 GMT
   Link: </api/v2/workspaces>; rel="successor-version"
   ```

---

## 13. WEBHOOKS & ASYNC INGRESS DESIGN

Webhook ingress endpoints must implement defensive verification:
1. **Signature Verification**: Require HMAC-SHA256 signatures in headers (`X-Signature-SHA256`).
2. **Replay Protection**: Validate timestamp headers (`X-Signature-Timestamp`) with a maximum tolerance (e.g., 300 seconds).
3. **Idempotency**: Webhook events must contain a unique `eventId` deduplicated before processing.
4. **Immediate Acknowledgment**: Return `200 OK` or `202 Accepted` immediately upon persisting event to queue; never execute long synchronous processing inside the webhook receiver.

---

## 14. 10-STAGE ENDPOINT DESIGN CHECKLIST

Before completing an endpoint design, execute this sequence:

| Step | Action | Required Deliverable |
| :--- | :--- | :--- |
| **1** | Identify Domain Entity | Define entity boundary and lifecycle |
| **2** | Determine Ownership | Establish tenant and principal security scoping |
| **3** | Choose HTTP Verb | Map state mutation semantics to standard verbs |
| **4** | Structure URL | Ensure kebab-case, nouns, and depth <= 2 |
| **5** | Define Request Schema | Specify DTO, types, regex, bounds, and nullability |
| **6** | Define Success Response | Document status (200/201/204), headers, DTO |
| **7** | Define Error Payloads | Specify RFC 7807 problem details and codes |
| **8** | Define Concurrency & Limits | Specify ETag, Idempotency-Key, and Rate Limits |
| **9** | Model Pagination & Queries | Specify cursor/offset keys, sort whitelist |
| **10** | Verify OpenAPI Spec | Write complete OpenAPI 3.1 snippet with examples |
