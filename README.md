# FlowForge

**A multi-tenant workflow automation and orchestration platform built
with TypeScript, React, and Node.js.**

FlowForge is an engineering project to build a resilient workflow engine
in which users can visually define multi-step workflows, execute them
asynchronously, observe their progress in real time, and recover from
failures through retries and compensating actions.

> **Project status:** Initial architecture and repository setup. The
> components and capabilities described below are the planned design
> unless explicitly marked as implemented. Update this section as
> development progresses.

------------------------------------------------------------------------

## Table of contents

-   [Project overview](#project-overview)
-   [Goals and scope](#goals-and-scope)
-   [Technology stack](#technology-stack)
-   [System architecture](#system-architecture)
-   [Core concepts](#core-concepts)
-   [Data model overview](#data-model-overview)
-   [Repository structure](#repository-structure)
-   [Getting started](#getting-started)
-   [Environment configuration](#environment-configuration)
-   [Development workflow](#development-workflow)
-   [Git and contribution workflow](#git-and-contribution-workflow)
-   [Testing and quality](#testing-and-quality)
-   [Security considerations](#security-considerations)
-   [Implementation roadmap](#implementation-roadmap)
-   [Documentation](#documentation)

------------------------------------------------------------------------

## Project overview

FlowForge is intended to provide a visual interface for defining
directed acyclic graph (DAG) workflows and a backend orchestration
engine that coordinates their execution.

A workflow consists of nodes (individual tasks) and edges (dependencies
or transitions between tasks). The backend validates the graph,
schedules eligible tasks, records execution state, retries transient
failures according to policy, and invokes compensation actions when a
workflow fails after earlier steps have completed.

The project is designed around these capabilities:

-   Multi-tenant data isolation.
-   A visual workflow editor with node validation and conditional
    branching.
-   DAG validation, including cycle detection.
-   Asynchronous workflow execution.
-   A state machine for tracking workflow and task states.
-   Saga-style compensation for distributed operations.
-   Retry policies with exponential backoff.
-   Dead-letter handling for jobs that exhaust their retry policy.
-   Live execution updates streamed to the frontend.
-   Sandboxed execution of user-defined transformation scripts.
-   Administrative visibility into quotas, failures, and worker
    performance.

### Project reference

The initial project brief describes a four-week implementation plan for
a **Multi-Tenant Distributed Workflow & Saga Orchestration Engine**. It
calls for a validated visual DAG canvas, tenant-aware routing, a
state-machine execution engine, Saga compensation, MongoDB Change
Streams, isolated script execution, WebSocket tracing, dead-letter
queues, monitoring, stress testing, and containerized deployment.

The roadmap below follows that brief while sequencing foundational
engineering work explicitly.

------------------------------------------------------------------------

## Goals and scope

### Primary goals

1.  Let users create, edit, validate, and version workflows.
2.  Execute workflow tasks asynchronously and track their state durably.
3.  Support dependency-based execution and conditional branching.
4.  Recover from transient errors through configurable retries.
5.  Compensate completed operations when a later operation fails.
6.  Isolate tenant data and enforce tenant context throughout API and
    worker operations.
7.  Stream execution events to connected clients.
8.  Provide operational visibility into execution failures and worker
    health.

### Initial scope boundaries

The first implementation should focus on a reliable single-region
deployment and a clear separation between the API process and worker
processes. The codebase may be organized as a monorepo and modular
monolith initially; separate deployable services can be introduced only
when there is a concrete operational need.

The project should implement its own workflow state machine and Saga
coordinator. A third-party workflow orchestration product should not
replace the core engine being built for this project.

------------------------------------------------------------------------

## Technology stack

The following is the selected baseline stack. Versions should be pinned
in the package manager lockfile and updated deliberately.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Language                TypeScript              Shared types and
                                                  application code

  Frontend                React + Vite            Workflow editor and
                                                  dashboard

  Styling                 Tailwind CSS            UI styling and design
                                                  system

  Workflow canvas         React Flow              Visual nodes, edges,
                          (`@xyflow/react`)       and graph interactions

  Client state            Zustand                 Local editor and UI
                                                  state

  Server state            TanStack Query          API data fetching,
                                                  caching, and mutations

  Backend runtime         Node.js                 API and worker runtime

  HTTP API                Express                 REST endpoints and
                                                  middleware

  Database                MongoDB                 Tenants, users,
                                                  workflows, executions,
                                                  and audit records

  Queue / coordination    Redis Streams           Asynchronous job
                                                  distribution and
                                                  consumer groups

  Real-time transport     Socket.IO               Execution events to
                                                  connected clients

  Validation              Zod                     Runtime validation of
                                                  API and workflow data

  Logging                 Pino                    Structured application
                                                  and worker logs

  Script isolation        `isolated-vm`           One layer for isolating
                                                  JavaScript
                                                  transformations

  Testing                 Vitest + Supertest      Unit and API
                                                  integration tests

  End-to-end testing      Playwright              Browser-level workflow
                                                  tests

  Local infrastructure    Docker Compose          MongoDB, Redis, and
                                                  local services

  CI                      GitHub Actions          Automated checks on
                                                  pushes and pull
                                                  requests

  Initial deployment      AWS ECS                 Container deployment
  target                                          without early
                                                  Kubernetes overhead

  Later orchestration     Kubernetes              Potential worker
  option                                          scaling and
                                                  orchestration at a
                                                  later stage
  -----------------------------------------------------------------------

### Important implementation choices

-   **Redis Streams:** Use consumer groups and explicit acknowledgement.
    Design for at-least-once delivery; workers must be idempotent
    because a job can be delivered again after a crash or lost
    acknowledgement.
-   **MongoDB Change Streams:** Use for reactive database-driven
    triggers where appropriate. They do not replace the execution queue
    or the durable execution state machine.
-   **Saga coordinator:** Implement workflow compensation and recovery
    as first-party project code.
-   **React Flow:** Use for the visual graph editor. The backend must
    independently validate every submitted graph; frontend validation is
    not a security or correctness boundary.
-   **AWS ECS before Kubernetes:** Keep deployment complexity
    proportionate to the project's current needs. Kubernetes can be
    evaluated after the core engine and worker lifecycle are stable.

------------------------------------------------------------------------

## System architecture

### High-level component diagram

``` mermaid
flowchart TD
    U[User] --> UI[React Dashboard]
    UI -->|REST API| API[Express API]
    UI <-->|Socket.IO| RT[Realtime Gateway]

    API --> AUTH[Authentication and Tenant Middleware]
    AUTH --> WF[Workflow Service]
    AUTH --> EX[Execution Service]

    WF --> DB[(MongoDB)]
    EX --> DB
    EX --> Q[(Redis Streams)]

    Q --> W[Worker Processes]
    W --> ENGINE[Workflow State Machine]
    ENGINE --> SAGA[Saga Coordinator]
    ENGINE --> DB
    SAGA --> COMP[Compensation Handlers]

    W --> EXT[External APIs and Integrations]
    W --> RT
    RT --> UI
```

### Component responsibilities

#### 1. Frontend application

The React application provides:

-   Workflow list, creation, and editing screens.
-   A React Flow canvas for nodes and edges.
-   Node configuration panels.
-   Client-side graph feedback and validation.
-   Execution history and execution detail views.
-   Live node status and log updates.
-   Administrative views for tenant usage and operational metrics.

The frontend is not authoritative for workflow validity, tenant
permissions, or execution state. The backend must validate and enforce
these rules.

#### 2. API application

The Express API is responsible for:

-   Authentication and authorization.
-   Resolving and validating tenant context.
-   Tenant-aware rate limiting and API key handling.
-   Workflow CRUD operations and versioning.
-   Server-side workflow validation.
-   Creating execution records and publishing execution requests.
-   Returning execution history and status.
-   Managing authenticated Socket.IO connections or coordinating with a
    real-time gateway.

Keep route handlers thin. Put business logic in services and persistence
operations behind repositories or data-access modules.

#### 3. Workflow service

The workflow service manages workflow definitions:

-   Node and edge schemas.
-   Graph validation.
-   Cycle detection and dependency checks.
-   Conditional edge configuration.
-   Workflow versioning.
-   Publishing immutable workflow versions for execution.

An execution should refer to a specific workflow version so edits made
later do not silently change an already-running execution.

#### 4. Execution engine

The execution engine coordinates workflow progression:

-   Loads the immutable workflow version.
-   Determines which nodes are eligible to run.
-   Checks dependency completion and branch conditions.
-   Persists state transitions.
-   Dispatches runnable tasks.
-   Handles task completion, failure, timeout, and cancellation.
-   Determines when a workflow has succeeded or failed.

The engine should use explicit, validated state transitions rather than
scattered status updates.

#### 5. Worker processes

Workers consume jobs from Redis Streams and execute individual task
attempts.

A worker should:

1.  Read a job from its consumer group.
2.  Load and verify the associated execution and task state.
3.  Confirm that the job is still eligible to run.
4.  Execute the task with a bounded timeout and resource policy.
5.  Persist the outcome.
6.  Acknowledge the queue message only after the durable outcome is
    recorded.
7.  Emit an execution event for the UI.

Workers must tolerate duplicate delivery and process restarts. Use
idempotency keys and conditional state updates to prevent duplicate side
effects where possible.

#### 6. Saga coordinator

The Saga coordinator manages compensating actions for workflows that
contain operations with external side effects.

For each completed compensatable step, retain enough metadata to
identify and invoke its compensation handler. If a later step fails, the
coordinator runs applicable compensations in the defined reverse order
and records each result.

Compensation is not a database rollback. It is a new operation intended
to semantically undo or mitigate an earlier side effect. Compensation
can itself fail and therefore needs its own retry, status, and
operator-recovery strategy.

#### 7. Redis Streams

Redis Streams is the initial asynchronous transport between the
API/execution services and worker processes.

Use separate streams or a clearly namespaced stream design for execution
jobs and operational events. Define:

-   Consumer groups and worker identities.
-   Pending-entry recovery for abandoned messages.
-   Acknowledgement rules.
-   Retry scheduling.
-   Maximum delivery / attempt policy.
-   Dead-letter handling.
-   Queue retention and trimming policy.

Do not treat Redis as the sole source of truth for workflow execution
state. MongoDB stores durable workflow and execution records.

#### 8. MongoDB

MongoDB stores application and execution data. Use tenant-aware indexes
and enforce tenant filters in the data-access layer.

MongoDB Change Streams may be used to detect selected data changes and
trigger workflows. Change Stream consumers need resume-token handling
and recovery behavior.

#### 9. Real-time gateway

Socket.IO delivers execution events to authorized clients. A client
should only subscribe to executions it is allowed to access. Every event
subscription and emission must be scoped to the relevant tenant and
execution.

------------------------------------------------------------------------

## Core concepts

### Workflow graph

A workflow is a directed graph:

-   **Node:** A task, trigger, condition, or transformation.
-   **Edge:** A dependency or conditional transition between nodes.
-   **DAG:** A directed graph with no cycles.
-   **Entry node:** A node with no incoming dependency, subject to the
    workflow's trigger semantics.
-   **Runnable node:** A node whose required dependencies and conditions
    have been satisfied.

The backend must reject invalid graphs, including cycles, missing node
references, invalid edge conditions, and unsupported node
configurations.

### Suggested execution states

Workflow execution states:

``` text
PENDING
  -> RUNNING
      -> SUCCEEDED
      -> FAILED
      -> COMPENSATING
          -> COMPENSATED
          -> COMPENSATION_FAILED
      -> CANCELLED
```

Task execution states:

``` text
PENDING
  -> QUEUED
  -> RUNNING
      -> SUCCEEDED
      -> RETRY_WAIT
          -> QUEUED
      -> FAILED
      -> SKIPPED
      -> CANCELLED
```

These are an initial vocabulary, not a final state-machine
specification. Define allowed transitions centrally and test every
transition. Terminal states should not be overwritten by stale worker
messages.

### Retry policy

A retry policy should define:

-   Maximum attempts.
-   Initial delay.
-   Backoff multiplier.
-   Maximum delay.
-   Optional jitter.
-   Which error classes are retryable.
-   Optional task timeout.

A typical exponential backoff delay is:

``` text
delay = min(maxDelay, initialDelay * (backoffMultiplier ^ retryNumber))
```

Add jitter to reduce synchronized retry bursts. Record each attempt
separately so the execution history explains what happened.

### Dead-letter handling

A task should enter the dead-letter flow after its retry policy is
exhausted or when an error is explicitly classified as non-retryable.

Dead-letter records should preserve the tenant, workflow, execution,
node, attempt, error summary, and timestamps. Provide a controlled way
to inspect and, where safe, replay or resolve failed work.

### Saga compensation

A compensatable node should define:

-   Its forward operation.
-   Its compensation operation.
-   The input/output data needed by compensation.
-   Idempotency behavior.
-   Timeout and retry policy.

On downstream failure, the coordinator should identify completed
compensatable steps and execute their compensation handlers in reverse
completion order, subject to the workflow's declared semantics.

------------------------------------------------------------------------

## Data model overview

This is a conceptual starting point. Final schemas, validation rules,
and indexes should be defined in code and documented as they evolve.

  -------------------------------------------------------------------------
  Collection              Purpose                   Important fields
  ----------------------- ------------------------- -----------------------
  `tenants`               Tenant accounts and       `_id`, `name`,
                          configuration             `status`, `createdAt`

  `users`                 User identities and       `_id`, `email`,
                          tenant memberships        `tenantMemberships[]`

  `api_keys`              Hashed API key metadata   `_id`, `tenantId`,
                                                    `keyHash`, `scopes`,
                                                    `revokedAt`

  `workflows`             Workflow metadata and     `_id`, `tenantId`,
                          current published version `name`, `status`,
                                                    `currentVersion`

  `workflow_versions`     Immutable workflow graph  `_id`, `tenantId`,
                          definitions               `workflowId`,
                                                    `version`, `nodes[]`,
                                                    `edges[]`

  `executions`            Workflow execution        `_id`, `tenantId`,
                          records                   `workflowId`,
                                                    `workflowVersion`,
                                                    `status`, timestamps

  `task_executions`       Per-node attempts and     `_id`, `tenantId`,
                          outcomes                  `executionId`,
                                                    `nodeId`, `attempt`,
                                                    `status`

  `execution_logs`        Structured execution      `_id`, `tenantId`,
                          events and diagnostics    `executionId`,
                                                    `nodeId`, `level`,
                                                    `message`, `timestamp`

  `audit_logs`            Security- and             `_id`, `tenantId`,
                          administration-relevant   `actorId`, `action`,
                          actions                   `resource`, `timestamp`
  -------------------------------------------------------------------------

### Multi-tenancy strategy

The initial strategy is a **shared MongoDB database with a `tenantId`
discriminator**.

Requirements:

-   Every tenant-owned document includes `tenantId`.
-   Every tenant-scoped read, update, and delete includes tenant
    context.
-   Tenant context is derived from authenticated identity or a validated
    API key, not trusted from arbitrary request-body fields.
-   Authorization checks verify that the authenticated principal belongs
    to the requested tenant.
-   Unique indexes should include `tenantId` where uniqueness is
    tenant-scoped.
-   Worker jobs carry tenant identity, and workers revalidate it against
    durable records.
-   Tests must attempt cross-tenant reads and writes and verify they are
    rejected.

Example compound index:

``` javascript
db.workflows.createIndex({
  tenantId: 1,
  createdAt: -1
});
```

A shared-database discriminator model is the starting point, not a claim
of physical database isolation. Revisit separate databases or stronger
isolation if future requirements demand it.

------------------------------------------------------------------------

## Repository structure

The proposed monorepo layout:

``` text
flowforge/
├── apps/
│   ├── web/                     # React + Vite frontend
│   ├── api/                     # Express HTTP API
│   └── worker/                  # Redis Streams consumers
│
├── packages/
│   ├── shared/                  # Shared types and constants
│   ├── workflow-engine/         # DAG validation and execution logic
│   ├── saga/                    # Compensation coordinator
│   ├── queue/                   # Redis Streams abstraction
│   ├── database/                # MongoDB connection, models, repositories
│   ├── validation/              # Shared Zod schemas
│   └── logger/                  # Pino configuration
│
├── infrastructure/
│   ├── docker/                  # Dockerfiles and related config
│   └── scripts/                 # Development and operations scripts
│
├── docs/                        # Architecture decisions and technical docs
├── .github/
│   ├── CODEOWNERS
│   └── workflows/               # CI workflows
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
└── README.md
```

The exact package boundaries can evolve. Avoid creating empty
abstractions solely to match this diagram; introduce each package when
it has a clear responsibility.

------------------------------------------------------------------------

## Getting started

### Prerequisites

Install the following before starting development:

-   Node.js LTS (use the version agreed by the team and pin it in
    `.nvmrc` or an equivalent version manager file).
-   pnpm (pin the package-manager version in the root `package.json`).
-   Git.
-   Docker Desktop or Docker Engine with the Compose plugin.
-   A MongoDB client such as `mongosh` (optional but useful).
-   A Redis CLI such as `redis-cli` (optional but useful).

### 1. Clone the repository

``` bash
git clone https://github.com/HrishavSah/flowforge.git
cd flowforge
```

### 2. Install dependencies

Once the monorepo manifests have been created:

``` bash
corepack enable
pnpm install
```

### 3. Configure environment variables

``` bash
cp .env.example .env
```

Populate the local values as described in [Environment
configuration](#environment-configuration). Do not commit `.env`.

### 4. Start local infrastructure

When `docker-compose.yml` is in place:

``` bash
docker compose up -d mongodb redis
```

Check service health:

``` bash
docker compose ps
```

### 5. Run database setup

Run the project's migration, index creation, or initialization command
once it has been implemented. MongoDB collections and indexes should be
created through version-controlled application scripts rather than
undocumented manual production changes.

### 6. Start development processes

The intended root scripts are:

``` bash
pnpm dev
```

Or start individual applications if the root scripts expose them:

``` bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter worker dev
```

These commands describe the planned workspace interface. They become
runnable after the corresponding packages and scripts are added.

------------------------------------------------------------------------

## Environment configuration

Create `.env.example` at the repository root. Keep real credentials in
local `.env` files or a secrets manager; never commit secrets.

Suggested initial variables:

``` dotenv
# Runtime
NODE_ENV=development
LOG_LEVEL=debug

# Frontend
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000

# API
API_PORT=4000
API_CORS_ORIGIN=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://localhost:27017/flowforge
MONGODB_DATABASE=flowforge

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
# Generate a strong random secret locally. Do not use this example in production.
AUTH_SECRET=replace-with-a-long-random-secret

# Worker
WORKER_CONCURRENCY=5
```

Add provider credentials, encryption keys, and integration secrets only
when the relevant feature is implemented. Validate environment variables
at process startup with Zod and fail fast when required values are
missing.

------------------------------------------------------------------------

## Development workflow

### General engineering practices

-   Use TypeScript for frontend, backend, workers, and shared packages.
-   Keep strict TypeScript checks enabled.
-   Validate all external input at runtime with Zod.
-   Keep route handlers thin and business logic in service modules.
-   Keep database access tenant-aware and centralized.
-   Use structured logs; avoid logging secrets or sensitive payloads.
-   Make worker operations idempotent.
-   Persist state transitions before acknowledging queue messages.
-   Add tests alongside each feature.
-   Document significant architectural decisions in `docs/`.

### Suggested code quality scripts

The root workspace should provide consistent scripts such as:

``` bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Only add scripts when the corresponding tooling is configured. CI should
run the checks that are actually present in the repository.

------------------------------------------------------------------------

## Git and contribution workflow

The `main` branch is protected. All changes must be submitted through
pull requests.

### Branch naming

Each team member should work on their own development branch:

``` text
dev/<member-name>
```

Create feature branches from the relevant development branch:

``` text
feature/<member-name>/<short-feature-name>
fix/<member-name>/<short-bug-description>
docs/<member-name>/<short-description>
```

Examples:

``` text
dev/alex
feature/alex/workflow-canvas
fix/alex/dag-cycle-detection
docs/alex/api-setup
```

### Pull request process

1.  Create or update your own development branch.
2.  Create a focused feature or fix branch.
3.  Commit changes with clear, conventional messages.
4.  Push the branch and open a PR targeting `main` (or follow the team
    lead's explicitly assigned integration target).
5.  Link relevant issues and describe the change, test evidence, and any
    migration or configuration impact.
6.  Request review from the team lead.
7.  Resolve review conversations and address requested changes.
8.  The team lead approves and merges the PR.

**Only the repository owner / team lead should merge changes into
`main`.** Branch protection and repository permissions should enforce
this policy; the written workflow is not a substitute for GitHub
rulesets.

### Commit message examples

``` text
feat(workflow): add DAG cycle validation
fix(worker): recover pending Redis stream messages
docs(readme): document local development setup
test(saga): cover compensation failure handling
```

### Pull request checklist

-   [ ] The change has a clear, focused purpose.
-   [ ] Type checks and relevant tests pass.
-   [ ] Tenant isolation is preserved.
-   [ ] Errors and failure paths are handled.
-   [ ] No secrets or sensitive data are committed.
-   [ ] Documentation is updated where needed.
-   [ ] The PR description includes test evidence.

------------------------------------------------------------------------

## Testing and quality

Testing should cover correctness and failure recovery, not only
successful execution.

### Unit tests

Prioritize:

-   DAG cycle detection and graph validation.
-   Dependency resolution and conditional branches.
-   Allowed and forbidden state transitions.
-   Retry delay calculation and retry classification.
-   Saga compensation ordering.
-   Idempotency and duplicate job handling.
-   Tenant-scoped authorization helpers.

### Integration tests

Prioritize:

-   API authentication and tenant middleware.
-   MongoDB repository tenant filters.
-   Redis Streams publish, consume, acknowledgement, and recovery.
-   Execution state persistence.
-   Worker restart and pending-message recovery.
-   Compensation and dead-letter behavior.

### End-to-end tests

Verify a user can:

1.  Create a workflow.
2.  Add and connect nodes.
3.  Save and validate the workflow.
4.  Start an execution.
5.  Observe live task updates.
6.  Inspect execution history and errors.

Also test failure scenarios: a task that retries, a task that exhausts
retries, and a downstream failure that triggers compensation.

### Load and resilience testing

The project brief calls for stress testing with **1,000+ concurrent
distributed execution pipelines**. Treat this as a benchmark target, not
an assumed capacity. Define the workload, infrastructure, success
criteria, latency percentiles, error rate, and resource limits before
reporting results.

------------------------------------------------------------------------

## Security considerations

FlowForge processes tenant data, API credentials, external requests, and
potentially user-defined code. Security must be designed into the
system.

-   Hash API keys at rest; show the raw key only at creation time.
-   Enforce tenant authorization on every API, data-access, worker, and
    real-time path.
-   Apply rate limits and request-size limits.
-   Validate workflow definitions and node configuration on the server.
-   Keep secrets out of logs, source control, and client bundles.
-   Use TLS in deployed environments.
-   Restrict worker network access and outbound destinations where
    possible.
-   Apply task timeouts, CPU limits, memory limits, and concurrency
    limits.
-   Audit security-sensitive actions.
-   Define retention and deletion policies for logs and execution data.

### User-defined script execution

`isolated-vm` can provide an isolation layer for JavaScript execution,
but **it must not be treated as a complete security boundary for
hostile, untrusted code**.

For stronger isolation, execute untrusted transformations in separately
constrained processes or containers with:

-   Non-root users.
-   Strict CPU, memory, process, and execution-time limits.
-   Restricted filesystem access.
-   Restricted or disabled network access by default.
-   Minimal container capabilities and an appropriate seccomp profile.
-   No access to application secrets, host sockets, or internal service
    credentials.
-   Explicit input/output size limits.

Do not expose arbitrary code execution to untrusted users until the
isolation model has been threat-modeled, tested, and reviewed.

------------------------------------------------------------------------

## Implementation roadmap

The roadmap follows the four-week project brief. The milestones are
targets; mark them complete only after implementation and verification.

### Week 1 --- Foundations and workflow authoring

-   Design the shared-database multi-tenant model and tenant-aware data
    access.
-   Build the React Flow workflow canvas.
-   Implement node validation, conditional branching, and cycle
    detection.
-   Implement Express tenant context middleware, rate limiting, and API
    key management.

**Mid-project review targets:**

-   Multi-tenant data isolation and dynamic routing operational.
-   Visual DAG canvas produces validated execution graphs.

### Week 2 --- Execution engine and Saga coordination

-   Build a state-machine execution engine.
-   Track workflow and task execution states.
-   Implement the Saga coordinator and compensation handlers.
-   Integrate MongoDB Change Streams for selected event-triggered
    workflows.

**Mid-project review target:**

-   Foundational Saga coordinator executes multi-step workflows and
    supports rollback/compensation behavior.

### Week 3 --- Sandboxing and live execution

-   Implement isolated execution for user-defined transformation
    scripts.
-   Establish bidirectional WebSocket streaming for live node execution
    traces.
-   Implement dead-letter handling and configurable retry policies.

**Review targets:**

-   Sandboxed script execution is validated against the documented
    threat model.
-   Live execution tracing reaches the frontend.
-   Retry and dead-letter paths are tested.

### Week 4 --- Operations, load testing, and deployment

-   Build an administrative dashboard for tenant quotas, failure
    heatmaps, and worker latency.
-   Stress test against the 1,000+ concurrent pipeline benchmark target.
-   Containerize the system.
-   Establish worker deployment and scaling using AWS ECS initially;
    evaluate Kubernetes if appropriate.

**Final review targets:**

-   Compensation behavior and sandboxed scripts validated.
-   Live execution tracing works end to end.
-   Deployment and failure-recovery documentation delivered.
-   Benchmark results and limitations documented.

### Final deliverables

-   Distributed Workflow & Saga Orchestration Report.
-   Architecture and operational documentation.
-   Test and benchmark results.
-   Failure-recovery and security documentation.
-   Deployment instructions.

------------------------------------------------------------------------

## Documentation

Keep detailed engineering documentation in `docs/`. Suggested documents:

``` text
docs/
├── architecture.md
├── database-schema.md
├── workflow-definition.md
├── execution-state-machine.md
├── saga-compensation.md
├── queue-and-retry-design.md
├── multi-tenancy-and-security.md
├── api-reference.md
├── deployment.md
└── testing-and-benchmarks.md
```

Use architecture decision records (ADRs) for decisions that affect
multiple parts of the system.

------------------------------------------------------------------------

## Team

FlowForge is developed collaboratively. See the repository's GitHub
contributors and pull request history for current ownership and
progress.

## License

Add the project's chosen license here before distributing or publishing
the code.
