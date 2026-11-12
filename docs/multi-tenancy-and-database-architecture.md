# FlowForge --- Multi-Tenancy and Database Architecture

## 1. Purpose

This document records FlowForge's initial multi-tenant MongoDB
architecture. It evaluates the two strategies specified in the project
brief: tenant discriminator keys in a shared database and dynamic
per-tenant database connection pools.

The system must allow multiple organizations (tenants) to use one
FlowForge deployment while preventing one tenant from reading,
modifying, or deleting another tenant's data.

This document records architectural decisions and implementation
conventions. It does not claim that the database layer or isolation
controls have already been implemented.

## 2. Decision summary

FlowForge will initially use:

-   One shared MongoDB database.
-   Tenant discriminator keys (`tenantId`) on every tenant-owned
    document.
-   A multi-tenant user membership model: one user identity may belong
    to multiple tenants.
-   A strict, typed tenant context established from trusted
    authentication credentials.
-   Centralized tenant-aware repositories for all tenant-owned
    persistence operations.
-   Mandatory cross-tenant isolation tests for reads, inserts, updates,
    deletes, and relevant aggregation operations.
-   Tenant context propagation into asynchronous worker jobs and
    real-time subscriptions.

Tenant identity must be derived from the authenticated principal and an
explicitly selected, authorized tenant membership, or from a
tenant-bound API key. A client-supplied `tenantId` must never be trusted
by itself.

## 3. Requirements and security invariant

The primary security invariant is:

> A request or job operating in the context of Tenant A must not read,
> change, delete, or infer Tenant B's tenant-owned data.

This must remain true even if the caller knows or guesses another
tenant's document ID.

The shared-database strategy does not provide physical database
separation. Isolation is enforced by the application data-access layer
and must be tested accordingly.

Functional requirements:

1.  Multiple independent tenants.
2.  Users who belong to more than one tenant.
3.  Tenant-owned workflows, workflow versions, executions, task
    executions, API keys, logs, and audit records.
4.  Tenant context available to API handlers and asynchronous workers.
5.  Efficient tenant-scoped queries and indexes.

## 4. Strategy evaluation

### 4.1 Option A --- Shared database with discriminator keys

All tenants use the same MongoDB database and collections. Each
tenant-owned document contains a `tenantId` field.

Example:

``` json
{
  "_id": "workflow_001",
  "tenantId": "tenant_A",
  "name": "Customer onboarding"
}
```

A tenant-scoped query includes the authenticated tenant identifier:

``` typescript
await workflows.find({
  tenantId: context.tenantId,
});
```

**Advantages**

-   One database connection configuration and connection pool.
-   Lower operational overhead for the initial team and project scope.
-   Simpler schema and index migrations.
-   Straightforward deployment and local development.
-   Efficient use of database resources when tenant workloads are
    relatively small.
-   Easier cross-tenant operational analytics when explicitly
    authorized.

**Disadvantages**

-   Every tenant-owned operation must enforce tenant scope.
-   An omitted or incorrect filter can expose another tenant's records.
-   Resource-intensive tenants can affect other tenants sharing the
    database.
-   Per-tenant backup and restore require additional tooling.
-   Tenant-specific database configuration is less straightforward.

### 4.2 Option B --- Dynamic per-tenant databases and connection pools

Each tenant receives a separate MongoDB database. The backend resolves
the tenant and selects its corresponding database connection or cached
connection pool.

``` text
MongoDB cluster
├── flowforge_tenant_A
│   ├── workflows
│   ├── executions
│   └── execution_logs
├── flowforge_tenant_B
│   ├── workflows
│   ├── executions
│   └── execution_logs
└── flowforge_tenant_C
    ├── workflows
    ├── executions
    └── execution_logs
```

**Advantages**

-   Stronger logical separation at the database boundary.
-   Tenant-specific backup, restore, and migration operations can be
    easier to isolate.
-   Tenant-specific database configuration is possible.
-   A query without a `tenantId` filter is less likely to return another
    tenant's documents when it is executed against the correct tenant
    database.

**Disadvantages**

-   Connection lifecycle and pool caching become more complex.
-   A large number of tenants can create significant connection and
    resource overhead.
-   Migrations must be coordinated across tenant databases.
-   Provisioning, deprovisioning, backup, and monitoring become more
    complicated.
-   Cross-tenant analytics and support operations require additional
    orchestration.
-   Incorrect tenant-to-database routing remains a security risk.

### 4.3 Comparison

  -----------------------------------------------------------------------
  Criterion               Shared database +       Database per tenant
                          `tenantId`              
  ----------------------- ----------------------- -----------------------
  Initial implementation  Lower                   Higher
  complexity                                      

  Connection management   Simple                  More complex

  Logical data separation Application-enforced    Database-level
                                                  separation

  Migration operations    Centralized             Per-tenant

  Resource efficiency at  Higher                  Lower
  small scale                                     

  Tenant-specific backup  More involved           More straightforward
  and restore                                     

  Tenant-specific         Limited                 Flexible
  configuration                                   

  Operational overhead    Lower                   Higher

  Risk from missing       High unless prevented   Reduced, but routing
  tenant filter                                   still matters
  -----------------------------------------------------------------------

## 5. Selected approach and rationale

**Decision: Adopt Option A for the initial implementation.**

The shared-database discriminator strategy best fits FlowForge's initial
scope and four-week delivery schedule.

1.  The team can focus on DAG execution, Saga coordination, retries, and
    workers instead of dynamic database provisioning.
2.  One MongoDB connection pool is easier to configure, test, and
    operate.
3.  Centralized repositories and mandatory isolation tests provide
    consistent enforcement points.
4.  The design can later evolve to dedicated databases for selected
    tenants if product, performance, contractual, or regulatory
    requirements justify the complexity.

This is a deliberate initial architecture choice, not a claim that
shared collections provide physical isolation.

## 6. Tenant and user identity model

### 6.1 Users may belong to multiple tenants

A user identity is not equivalent to a tenant. One user may be a member
of multiple organizations and may have different roles or permissions in
each organization.

The conceptual relationship is:

``` text
User
  |
  | one-to-many
  v
Tenant Membership
  |
  | many-to-one
  v
Tenant
```

A membership record associates a user with a tenant and carries
tenant-specific authorization information.

Example:

``` json
{
  "_id": "membership_001",
  "userId": "user_123",
  "tenantId": "tenant_A",
  "role": "admin",
  "status": "active"
}
```

The same user may have another membership for `tenant_B`. The role
values are illustrative; the final role and permission model is outside
FF-01.

### 6.2 Tenant selection and resolution

For interactive sessions, a user may select an active tenant from their
authorized memberships. The backend must verify that membership before
establishing tenant context.

For tenant-bound API keys, the key record identifies the tenant to which
the key belongs. The tenant must still be checked for active status and
the key's scopes must be enforced.

A tenant ID in a request body, query parameter, URL parameter, or
arbitrary header is not proof of membership.

## 7. Collection ownership and tenant scoping

Initial conceptual collection inventory:

  Collection                              Tenant-owned? Tenant field
  ---------------------- ------------------------------ -----------------
  `tenants`                      No; it defines tenants Not applicable
  `users`                          Global user identity Not necessarily
  `tenant_memberships`                              Yes Required
  `api_keys`                                        Yes Required
  `workflows`                                       Yes Required
  `workflow_versions`                               Yes Required
  `executions`                                      Yes Required
  `task_executions`                                 Yes Required
  `execution_logs`                                  Yes Required
  `audit_logs`             Yes for tenant-scoped events Required

Rules:

-   Global user identity records should not be duplicated solely because
    a user joins another tenant.
-   Membership records belong to a tenant.
-   Every workflow version retains the owning tenant identifier, even if
    it references a workflow.
-   Every execution and task execution retains tenant identity so
    workers and log access can be scoped without trusting a client
    value.
-   Tenant-owned audit records retain tenant identity.
-   Every future collection must be classified as global or tenant-owned
    before introduction.

## 8. Typed tenant context

Tenant identity must be explicit in application code.

The shared contract should begin with a typed context similar to:

``` typescript
export interface TenantContext {
  tenantId: string;
  userId: string;
  membershipId?: string;
  authType: "session" | "api_key" | "internal";
}
```

The exact fields may evolve as authentication is implemented. The
essential rule is that tenant-owned repository methods receive a
validated context rather than an arbitrary tenant ID from untrusted
input.

### 8.1 Request lifecycle

``` text
Incoming request
       |
       v
Authenticate credential
       |
       v
Resolve user or API-key principal
       |
       v
Resolve requested/associated tenant
       |
       v
Verify active membership or tenant-bound key
       |
       v
Create typed TenantContext
       |
       v
Call tenant-aware service/repository
       |
       v
Execute tenant-scoped database operation
```

### 8.2 Context trust rules

-   The context is created by trusted authentication and
    tenant-resolution middleware.
-   A user-selected tenant is accepted only after membership
    authorization.
-   An API key resolves to its associated tenant; a client cannot
    override it.
-   Internal worker contexts are created from validated durable records
    or authenticated service-to-service messages.
-   Missing or invalid tenant context fails closed.
-   There is no silent fallback to an unscoped query.

## 9. Centralized tenant-aware repository rules

All tenant-owned persistence operations must pass through centralized
repositories or an equivalent data-access boundary. Tenant-facing
controllers and services should not directly query tenant-owned MongoDB
collections.

### 9.1 Required interface pattern

``` typescript
export interface TenantContext {
  tenantId: string;
  userId: string;
  authType: "session" | "api_key" | "internal";
}

export interface WorkflowRepository {
  findMany(context: TenantContext): Promise<Workflow[]>;

  findById(
    context: TenantContext,
    workflowId: string
  ): Promise<Workflow | null>;

  updateById(
    context: TenantContext,
    workflowId: string,
    update: WorkflowUpdate
  ): Promise<Workflow | null>;

  deleteById(
    context: TenantContext,
    workflowId: string
  ): Promise<boolean>;
}
```

### 9.2 Reads

Scope the resource identifier and tenant identifier together:

``` typescript
const workflow = await workflows.findOne({
  _id: workflowId,
  tenantId: context.tenantId,
});
```

Do not implement tenant-facing methods that accept only `workflowId`.

### 9.3 Inserts

Tenant identity comes from trusted context, not the request payload:

``` typescript
const document = {
  ...validatedInput,
  tenantId: context.tenantId,
};

await workflows.insertOne(document);
```

If a client includes `tenantId` in its payload, the API must ignore it
or reject the payload according to the API contract. It must never
override trusted context.

### 9.4 Updates and deletes

Both the resource identifier and tenant identifier must be included in
the database filter:

``` typescript
await workflows.updateOne(
  {
    _id: workflowId,
    tenantId: context.tenantId,
  },
  {
    $set: validatedUpdate,
  }
);
```

``` typescript
await workflows.deleteOne({
  _id: workflowId,
  tenantId: context.tenantId,
});
```

A resource belonging to another tenant should not be modified or
deleted. The API may return a not-found response to avoid disclosing
that the resource exists.

### 9.5 Aggregations

Apply tenant scoping at the beginning of aggregation pipelines for
tenant-owned collections:

``` typescript
const results = await workflows.aggregate([
  {
    $match: {
      tenantId: context.tenantId,
    },
  },
  // Additional tenant-scoped stages.
]);
```

For `$lookup`, `$unionWith`, nested pipelines, and other stages
accessing additional tenant-owned collections, the joined collection
must also be scoped to the same tenant. Filtering the first collection
does not automatically secure joined data.

### 9.6 Prohibited patterns

``` typescript
// Prohibited: no tenant scope
await Workflow.findById(workflowId);

// Prohibited: trusts an arbitrary client-supplied tenant ID
await Workflow.find({
  tenantId: req.body.tenantId,
});

// Prohibited: unrestricted collection access from a controller
await db.collection("workflows").find({}).toArray();
```

Administrative cross-tenant operations, if required later, must use a
separate privileged interface with explicit authorization, auditing, and
tests. They must not be exposed through ordinary tenant repositories.

## 10. Indexing strategy

Indexes should reflect tenant-scoped access patterns. Tenant identifiers
should generally lead compound indexes for tenant-scoped queries.

### Workflows

``` javascript
db.workflows.createIndex({
  tenantId: 1,
  createdAt: -1
});
```

### Workflow versions

``` javascript
db.workflow_versions.createIndex(
  {
    tenantId: 1,
    workflowId: 1,
    version: 1
  },
  {
    unique: true
  }
);
```

### Executions

``` javascript
db.executions.createIndex({
  tenantId: 1,
  workflowId: 1,
  createdAt: -1
});
```

### Task executions

``` javascript
db.task_executions.createIndex({
  tenantId: 1,
  executionId: 1,
  nodeId: 1
});
```

API key lookup should use a unique index on the stored key hash or its
chosen lookup representation. The tenant identifier must be retained on
the record and checked after key resolution.

Finalize indexes against actual query patterns in implementation issues.
Consider write and storage costs before adding indexes.

## 11. Asynchronous workers and real-time events

Tenant isolation must continue beyond the HTTP request lifecycle.

### 11.1 Worker jobs

Every queued job referring to tenant-owned resources must carry tenant
identity and stable resource identifiers.

``` typescript
interface ExecutionJob {
  jobId: string;
  tenantId: string;
  executionId: string;
  workflowId: string;
  workflowVersion: number;
  nodeId: string;
}
```

A worker must not blindly trust a queue payload as authorization. It
must load the durable execution record using both execution ID and
tenant ID, confirm the expected state, and then process the task.

### 11.2 Socket.IO

Real-time subscriptions must be authorized against the authenticated
user's tenant membership or the relevant API-key/service permissions.

A client must not subscribe to another tenant's execution room by
guessing an execution ID or room name. Room naming conventions are not a
security boundary. Authorization must happen server-side before joining
a room or emitting tenant-specific events.

## 12. Mandatory isolation testing

Cross-tenant isolation tests are a required part of the architecture,
not optional follow-up work.

Create at least two tenants (Tenant A and Tenant B) and seed records for
both.

  -----------------------------------------------------------------------
  Test                                Expected result
  ----------------------------------- -----------------------------------
  Tenant A lists workflows            Only Tenant A workflows returned

  Tenant A reads Tenant B workflow by No record disclosed
  ID                                  

  Tenant A updates Tenant B workflow  No modification
  by ID                               

  Tenant A deletes Tenant B workflow  No deletion
  by ID                               

  Tenant A inserts with Tenant B ID   Tenant A context wins or request is
  in request body                     rejected

  Tenant A queries execution history  Only Tenant A executions returned

  Tenant A reads task executions      Only Tenant A task executions
                                      returned

  Tenant A reads execution logs       Only Tenant A logs returned

  Tenant A aggregates workflows and   No Tenant B data included
  joined data                         

  Tenant A accesses Tenant B API key  Rejected

  Worker receives mismatched          Job rejected
  tenant/execution IDs                

  User selects a tenant without       Request rejected
  membership                          
  -----------------------------------------------------------------------

Tests should exercise repository methods and API-level behavior. Where
practical, use a real MongoDB test instance or test container rather
than relying only on mocked query objects.

A test that merely checks whether a query object contains `tenantId` is
insufficient. Verify observable results and the absence of cross-tenant
side effects.

## 13. Operational considerations and risks

### 13.1 No unscoped access by default

Tenant-facing code must have no convenient path to query tenant-owned
collections without context. Keep raw database handles inside the
database package where practical.

### 13.2 Tenant-aware logging

Logs may include tenant identifiers for operational correlation, but
must not contain API keys, authorization headers, secrets, or sensitive
user payloads.

### 13.3 Resource fairness

Tenants share database resources. Rate limits, execution quotas, worker
concurrency controls, and monitoring will be needed as the system grows.
These are related to, but separate from, database-level tenant scoping.

### 13.4 Backups and restoration

Whole-database backup is straightforward, but tenant-specific
restoration requires a carefully designed export/import or recovery
procedure. Do not promise per-tenant point-in-time restoration until
implemented and tested.

### 13.5 Administrative access

Any cross-tenant support or administrative operation must be explicitly
privileged, narrowly scoped, auditable, and unavailable to ordinary
tenant users.

## 14. Future evolution

The initial architecture should not make future database isolation
impossible.

1.  **Initial:** Shared database with strict tenant discriminator
    enforcement.
2.  **Selective isolation:** Dedicated databases for tenants with
    justified operational, contractual, or performance requirements.
3.  **Advanced isolation:** Dedicated clusters or deployment
    configurations where required.

A future database-per-tenant design requires a tenant-to-database
routing registry, connection-pool lifecycle management, migration
orchestration, backup/restore procedures, and operational monitoring.
None of these mechanisms are required for FF-01.

## 15. Implementation boundaries and follow-up issues

This document records the architecture decision. Implementation belongs
to subsequent Week 1 issues:

  -----------------------------------------------------------------------
  Issue                               Responsibility
  ----------------------------------- -----------------------------------
  FF-02                               Establish MongoDB connection and
                                      database package

  FF-03                               Define tenant and tenant-owned data
                                      models

  FF-04                               Implement tenant-aware repository
                                      and data-access conventions

  FF-13                               Implement Express tenant context
                                      middleware

  FF-16                               Integrate tenant context and
                                      protected workflow API
  -----------------------------------------------------------------------

The architecture decision is complete when this document is reviewed and
accepted. Implementation is complete only when the follow-up issues and
their acceptance criteria are met.

## 16. FF-01 acceptance checklist

-   [x] Shared-database discriminator strategy selected.
-   [x] Dynamic per-tenant database strategy evaluated.
-   [x] Trade-offs documented.
-   [x] Multi-tenant user membership model selected.
-   [x] Strict typed tenant context requirement established.
-   [x] Centralized tenant-aware repository requirement established.
-   [x] CRUD and aggregation scoping rules documented.
-   [x] Worker and Socket.IO tenant propagation requirements documented.
-   [x] Cross-tenant isolation test requirements documented.
-   [x] Future migration path documented.

------------------------------------------------------------------------

**Final decision:** FlowForge will begin with a shared MongoDB database
using tenant discriminator keys, support users belonging to multiple
tenants, and enforce isolation through trusted typed tenant context,
centralized repositories, and mandatory cross-tenant isolation tests.
