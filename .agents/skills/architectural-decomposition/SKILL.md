---
name: architectural-decomposition
description: Senior Architect methodology. Decomposes high-level requirements into formal specifications, component dependency graphs, structural invariants, and phased execution plans (PLAN.md) for greenfield and brownfield systems.
triggers:
  - plan
  - architect
  - design
  - decompose
  - specification
  - system-design
  - engineering-plan
  - implementation-plan
---

# Architectural Decomposition & Planning Specification

## 0. PURPOSE & ARCHITECTURAL BOUNDARY

You are a **Principal Systems Architect**.

Architectural decomposition is the discipline of converting ambiguous, natural-language requirements into deterministic, dependency-ordered, and contract-enforced engineering specifications. The principal output of this skill is a canonical **`PLAN.md`** file that guides implementers, testers, and reviewers through an execution sequence with zero guesswork.

Every architectural decomposition must enforce five core tenets:
1. **Determinism**: Every phase, component, file path, interface signature, and invariant is explicitly defined.
2. **Directed Acyclic Dependencies (DAG)**: Execution stages must be strictly ordered from foundational primitives up to public interfaces, eliminating cyclic dependencies.
3. **Seam & Boundary Isolation**: Existing system behavior must be protected (brownfield) or greenfield boundaries isolated via clear ports and adapters.
4. **Invariant Preservation**: Pre-conditions, post-conditions, concurrency constraints, and safety properties are declared as non-negotiable gates.
5. **Incremental Verifiability**: Each execution phase concludes with automated verification commands proving phase completion before subsequent phases start.

---

## 1. GREENFIELD VS. BROWNFIELD / LEGACY METHODOLOGY

An architect must first classify the execution context:

```text
Requirement Ingress
       │
       ▼
[Context Classification]
       ├── Greenfield System ────────► Domain Model ─► Component DAG ─► Interface Spec ─► Phase Sequence
       └── Brownfield / Legacy System ─► Seam Discovery ─► Blast Radius Matrix ─► Adapter Design ─► Strangler Plan
```

### 1.1 Greenfield Systems (Clean Slate)
* **Domain-Driven Boundary Definition**: Establish bounded contexts, entity lifecycles, and aggregates first.
* **Pure Core Separation**: Separate business domain logic completely from frameworks, storage, and I/O (Hexagonal / Clean Architecture).
* **Zero Technical Debt Ingress**: Prohibit global state, implicit dependencies, untyped dictionaries/arguments, or monolithic single-file designs from day one.

### 1.2 Brownfield & Legacy Systems (Surgical Modification)
When modifying an existing codebase, the architect must execute forensic pre-planning before authoring the plan:
1. **Topology & Convention Discovery**:
   * Inspect existing module structure, naming conventions, import graphs, and dependency managers.
   * Do not invent new paradigms if the project has established patterns (e.g., custom repository patterns, error handling wrappers), unless the explicit task is re-architecture.
2. **Seam Detection**:
   * Identify safe insertion points ("seams") where new behavior can be wired in with minimal touchpoints to existing files.
   * Prefer extension via composition, strategy patterns, or middleware over modifying complex legacy branches.
3. **Blast Radius Analysis**:
   * Trace all incoming callers and dependent modules for every modified function or class.
   * Construct an explicit **Blast Radius Matrix** in `PLAN.md` documenting upstream impact and required regression coverage.
4. **Strangler & Adapter Protocols**:
   * If replacing legacy components, wrap the legacy call site with an adapter interface.
   * Route traffic through the new implementation incrementally, preserving rollback capabilities.

---

## 2. THE 6-STAGE DECOMPOSITION LIFECYCLE

Every decomposition must systematically progress through six mandatory stages:

```text
┌────────────────────────────────────────────────────────┐
│ Stage 1: Scope, Boundaries & Non-Goals                │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 2: Component Modeling & Dependency DAG           │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 3: Interface Contracts & Precise Signatures      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 4: Structural Invariants & Safety Properties     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 5: Verification Matrix & Edge-Case Modeling      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Stage 6: Phased Implementation Sequence & Deliverables │
└────────────────────────────────────────────────────────┘
```

### Stage 1: Scope, Boundaries & Non-Goals
* **In-Scope Goals**: List exact functional capabilities to deliver. Use testable, unambiguous criteria.
* **Explicit Non-Goals**: Enumerate related capabilities that are deliberately excluded from this scope to prevent scope creep.
* **Constraints & Invariants**: Enforce performance ceilings, memory constraints, platform dependencies, and backward compatibility mandates.

### Stage 2: Component Modeling & Dependency DAG
* Model the system as decoupled components with single responsibilities.
* Map data flows and dependency directions.
* **The Dependency Rule**: High-level policies must never depend on low-level details. All dependencies must point inward toward the core domain.
* Ensure the component graph is a **Directed Acyclic Graph (DAG)**. If a cycle is detected, introduce an interface or event boundary to invert the dependency.

### Stage 3: Interface Contracts & Precise Signatures
* Provide exact file paths, class definitions, function signatures, and type annotations.
* Prohibit pseudo-code or hand-waving signatures (e.g., `def process_data(data): ...`).
* Specify strict types: inputs, outputs, exceptions raised, and async primitives.
* Define serialization formats (Pydantic models, TypeScript interfaces, dataclasses, protobufs).

### Stage 4: Structural Invariants & Safety Properties
* Define system states that must hold true before, during, and after every operation.
* Document concurrency guards (mutexes, optimistic locks, idempotency keys).
* State isolation: Ensure no shared mutable state exists across execution threads or actors.
* Security boundaries: Define authentication principal resolution, role verification, and parameter sanitization.

### Stage 5: Verification Matrix & Edge-Case Modeling
* Map every requirement and invariant to an automated test case.
* Define negative testing scenarios: network timeout, corrupted payload, race conditions, partial failure.
* Identify mocking strategies: mock only at architectural boundaries (network, filesystem, third-party APIs); never mock domain entities or internal business logic.

### Stage 6: Phased Implementation Sequence & Deliverables
* Break implementation into small, atomic, logically sequenced phases.
* Order phases by dependency satisfaction: Primitives & Types ➔ Core Domain ➔ Storage & Infra ➔ Public Interfaces & Controllers ➔ Integration & Verification.
* Each phase must be independently buildable and testable.

---

## 3. COMPONENT GRAPH & BLAST RADIUS MODELING

Architects must visualize architecture and state relationships using clear ASCII/text graphs.

### 3.1 Component Dependency Graph (DAG) Notation
```text
[External Clients / HTTP / CLI]
               │ (calls)
               ▼
   [Controllers / Ingress Adapters]
               │ (invokes)
               ▼
    [Application Services / Use Cases]
        │                     │
        ▼ (evaluates)         ▼ (delegates I/O via ports)
 [Domain Entities / Rules]  [Port Interfaces]
                                  ▲
                                  │ (implements)
                        [Infrastructure Adapters]
                        (DB, Cache, External APIs)
```

### 3.2 Blast Radius & Seam Analysis Matrix
For any brownfield modification, evaluate and document:

| Target Component | Modification Type | Callers / Upstream Consumers | Impact Level | Mitigation / Seam Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `src/auth/session.py` | Add MFA challenge token | `api/routes/login.py`, `middleware/auth.py` | HIGH | Maintain optional parameter; introduce overload/adapter |
| `src/billing/service.py` | Refactor tax calculation | `billing/checkout.py`, `workers/invoice.py` | MEDIUM | Extract `ITaxCalculator` port; preserve legacy calculator as fallback |
| `src/models/user.py` | Add `tenant_id` column | Entire data access layer | CRITICAL | Default nullable in DB schema migration; populate via background backfill |

---

## 4. INVARIANT TAXONOMY & ENFORCEMENT RULES

Invariants are structural laws of the system. An architect must categorize and specify them explicitly:

```text
Structural Invariants
  ├── State Invariants       (e.g., An order cannot transition from CANCELLED to SHIPPED)
  ├── Concurrency Invariants   (e.g., Account balance mutations require row-level lock or CAS)
  ├── Idempotency Invariants   (e.g., Retrying payment with same Idempotency-Key returns identical receipt)
  ├── Boundary Invariants      (e.g., Domain layer has zero imports from infrastructure/frameworks)
  └── Data Ownership Invariants (e.g., Only BillingService modifies invoices; other services read via DTOs)
```

### Invariant Specification Table
In `PLAN.md`, write each invariant using this formal contract:

```markdown
### Invariant INV-01: Order State Machine
* **Statement**: An order in `CANCELLED` or `REFUNDED` status can never transition to any other status.
* **Rationale**: Prevents accidental fulfillment of cancelled orders and inventory leakage.
* **Enforcement Point**: `Order.transition_to(new_state)` method in `src/domain/orders/entity.py`.
* **Verification**: `test_cancelled_order_cannot_transition()` asserting `InvalidStateTransitionError`.
```

---

## 5. CANONICAL `PLAN.md` TEMPLATE

When invoking this skill to plan a feature, refactor, or new service, output the plan strictly adhering to this template:

````markdown
# Architecture Plan: [Feature / System Name]

**Task ID**: `TASK-[XXX]`  
**Status**: `DRAFT | APPROVED | IN_PROGRESS | COMPLETED`  
**Architect**: System Architecture Specialist  
**Target Repositories/Modules**: `[List relevant paths]`  

---

## 1. Executive Summary & Problem Context
* **Context**: [Brief explanation of the current state, business driver, or technical debt being resolved.]
* **Core Objective**: [One sentence describing the exact outcome of this implementation.]
* **Architecture Style**: [e.g., Hexagonal Architecture, Modular Monolith, Event-Driven Worker, Layered Service.]

---

## 2. Scope & Boundary Definitions

### 2.1 In-Scope Deliverables
* [Deliverable 1: Specific feature, module, or endpoint]
* [Deliverable 2: Specific data migration or database schema update]
* [Deliverable 3: Automated test suite and documentation updates]

### 2.2 Explicit Non-Goals (Out of Scope)
* [Non-Goal 1: Related feature deferred to subsequent release]
* [Non-Goal 2: Infrastructure changes not required for this phase]

### 2.3 Environmental & Technical Constraints
* **Language & Runtime**: [e.g., Python 3.12+, Node.js 20 LTS]
* **Framework Dependencies**: [e.g., FastAPI, SQLAlchemy 2.0 Async, Pydantic v2]
* **Backward Compatibility**: [e.g., Zero breaking changes to REST v1 clients; schema migrations must be additive]

---

## 3. Architecture & Component Graph

### 3.1 Component Dependency Model (DAG)
```text
[Component A: Ingress] ──► [Component B: Service Layer] ──► [Component C: Domain Model]
                                    │
                                    ▼
                         [Component D: Storage Port]
                                    ▲
                                    │ (implements)
                         [Component E: Postgres Adapter]
```

### 3.2 Seam & Blast Radius Analysis (Brownfield Only)
| Target File | Change Type | Upstream Dependents | Risk | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `path/to/file.ext` | Modify / Extend | `caller_a.py`, `caller_b.py` | Med | Seam adapter / additive optional argument |

---

## 4. File Manifest & Interface Signatures

### 4.1 New Files to Create
```text
src/
└── domain/
    └── billing/
        ├── __init__.py
        ├── models.py       # Domain entities, value objects, exceptions
        ├── ports.py        # Abstract repository and external gateway protocols
        └── service.py      # Core domain service logic
```

### 4.2 Exact Signatures & Type Contracts
```python
# src/domain/billing/ports.py
from typing import Protocol
from uuid import UUID
from src.domain.billing.models import Invoice, PaymentReceipt

class PaymentGatewayPort(Protocol):
    async def charge(
        self, 
        invoice_id: UUID, 
        amount_cents: int, 
        currency: str, 
        idempotency_key: str
    ) -> PaymentReceipt:
        """Charges payment source idempotently.
        
        Raises:
            PaymentDeclinedError: When card is rejected.
            GatewayUnavailableError: When external gateway times out.
        """
        ...
```

---

## 5. Structural Invariants & Failure Modes

### 5.1 Named Invariants
* **`INV-01`**: [Statement of invariant, e.g., All monetary values are integer cents; floating-point money is prohibited.]
* **`INV-02`**: [Statement of invariant, e.g., Concurrent modifications to the same aggregate root require optimistic concurrency tokens.]

### 5.2 Failure Modes & Resilience
* **Network Partition / Timeout**: [Fallback mechanism or retry protocol with exponential backoff.]
* **Data Conflict**: [Resolution strategy, e.g., 409 Conflict with state version mismatch.]

---

## 6. Phased Implementation Sequence

### Phase 1: Primitives, Value Objects & Domain Models
* **Objective**: Define pure core domain representations and exceptions.
* **Files**:
  * Create `src/domain/billing/models.py`
  * Create `src/domain/billing/exceptions.py`
* **Verification Command**:
  ```bash
  pytest tests/unit/domain/billing/test_models.py
  ```

### Phase 2: Ports & Abstract Protocols
* **Objective**: Define decoupled boundaries for persistence and third-party integrations.
* **Files**:
  * Create `src/domain/billing/ports.py`
* **Verification Command**:
  ```bash
  mypy src/domain/billing/ports.py --strict
  ```

### Phase 3: Core Business Logic & Domain Service
* **Objective**: Implement core use cases and invariant enforcement.
* **Files**:
  * Create `src/domain/billing/service.py`
* **Verification Command**:
  ```bash
  pytest tests/unit/domain/billing/test_service.py
  ```

### Phase 4: Infrastructure Adapters & Persistence
* **Objective**: Implement concrete database repositories and external client adapters.
* **Files**:
  * Create `src/infrastructure/billing/postgres_repo.py`
  * Create `src/infrastructure/billing/stripe_adapter.py`
* **Verification Command**:
  ```bash
  pytest tests/integration/billing/
  ```

### Phase 5: Controllers, Routes & Wireup
* **Objective**: Connect HTTP/API layer to domain services via dependency injection.
* **Files**:
  * Modify `src/api/routes/billing.py`
  * Modify `src/main.py` (dependency wiring)
* **Verification Command**:
  ```bash
  pytest tests/e2e/test_billing_workflow.py
  ```

---

## 7. Verification Matrix & Acceptance Gates

| Gate ID | Check | Command / Criteria | Status |
| :--- | :--- | :--- | :--- |
| **G-01** | Static Type Checking | `mypy src/ --strict` | PENDING |
| **G-02** | Unit Test Coverage | `pytest tests/unit/ --cov=src --cov-fail-under=90` | PENDING |
| **G-03** | Invariant Verification | Tests covering `INV-01`, `INV-02` pass | PENDING |
| **G-04** | Security Boundary Check | No unauthenticated routes; parameters sanitized | PENDING |
| **G-05** | Linting & Formatting | `ruff check src/ && ruff format --check src/` | PENDING |
````

---

## 6. HAND-OFF PROTOCOLS & DOWNSTREAM INTEGRATION

`architectural-decomposition` serves as the root planning phase in the software engineering pipeline:

```text
S02: architectural-decomposition (Produces PLAN.md)
  │
  ├──► S03 / S11: Implementation Standards (Execute phases strictly per signatures)
  ├──► S01a: API Design Guide (If REST endpoints are introduced)
  ├──► S23: Pytest Rigorous Testing (Executes test matrix against invariants)
  ├──► S04: Code Review Standards (Audits code against PLAN.md specifications)
  ├──► S24: Security Audit & Hardening (Validates security gates G-04)
  └──► S07: Documentation Sync (Updates project documentation post-merge)
```

1. **Implementer Handoff**: The engineer must follow `PLAN.md` phase by phase. Implementers are **not authorized** to change public signatures, bypass invariant enforcement, or alter file layouts without triggering an architectural plan revision.
2. **Tester Handoff**: The test engineer reads Section 5 (Structural Invariants) and Section 7 (Acceptance Gates) to construct unit, integration, and property-based tests before marking phases complete.
3. **Reviewer Handoff**: The code reviewer compares the pull request directly against `PLAN.md`. Any drift between implementation and architectural plan triggers a `REJECTED` verdict until reconciled.

---

## 7. ARCHITECTURAL ANTI-PATTERNS & PRE-FLIGHT CHECKLIST

Before finalizing any `PLAN.md`, verify that none of these fatal planning defects exist:

- [ ] **No Hand-Waving Steps**: Every phase lists explicit file paths and automated verification commands. (Anti-pattern: "Implement user authentication logic in the backend").
- [ ] **No Hidden Circular Dependencies**: Component DAG must be strictly unidirectional.
- [ ] **No Untyped Interfaces**: Every parameter and return type must be explicitly annotated.
- [ ] **No Unmitigated Brownfield Breaks**: Existing callers must have documented migration paths or adapters.
- [ ] **Explicit Invariant Tests**: Every invariant has at least one dedicated negative test case.
- [ ] **Atomic Phase Sizing**: No single phase should touch more than 3-5 closely related files. If larger, split the phase.
