# FlowForge – Workflow Graph Format

## 1. Overview

FlowForge uses a shared workflow graph format to represent workflows consistently between the frontend and backend.

The shared TypeScript types and Zod schemas are maintained in `packages/shared`.

## 2. Workflow Graph

A workflow graph contains:

- Workflow ID
- Workflow name
- Version
- Creation timestamp
- Nodes
- Edges

## 3. Supported Node Types

FlowForge supports four node types:

| Node type | Purpose |
|---|---|
| `start` | Workflow entry point |
| `action` | Executes a task |
| `condition` | Evaluates a condition |
| `end` | Completes the workflow |

## 4. Node Structure

Each node contains:

- `id`: Unique node identifier.
- `type`: Supported workflow node type.
- `position`: X and Y coordinates.
- `data`: Node configuration.

### Node Configuration

| Field | Type | Description |
|---|---|---|
| `label` | string | Node display name |
| `description` | string | Node description |
| `retries` | number | Retry count (0–10) |
| `compensation` | string | Compensation configuration |
| `condition` | string | Condition expression |

## 5. Edge Structure

Edges define connections between workflow nodes.

Each edge contains:

- `id`: Edge identifier.
- `source`: Source node ID.
- `target`: Target node ID.
- `sourceHandle`: Optional conditional branch.
- `targetHandle`: Optional target handle.

## 6. Conditional Edge Metadata

Condition nodes support two output branches:

- `true`: Used when the condition evaluates to true.
- `false`: Used when the condition evaluates to false.

The branch is represented through the edge's `sourceHandle` property.

## 7. Validation Format

Workflow validation issues use a consistent structure:

| Field | Type | Description |
|---|---|---|
| `id` | string | Issue identifier |
| `severity` | error or warning | Issue severity |
| `message` | string | Description |
| `nodeId` | optional string | Related node |
| `edgeId` | optional string | Related edge |

The validation result contains:

- `valid`: Whether the workflow is valid.
- `issues`: List of validation issues.

## 8. Zod Schema Validation

The shared package provides Zod schemas to validate:

- Node identifiers.
- Node types.
- Node configuration.
- Workflow nodes.
- Workflow edges.
- Complete workflow graphs.
- Workflow validation issues.
- Workflow validation results.

Graph-level structural validation, including duplicate node IDs, missing node references and cycle detection, is outside the scope of these Zod schemas. These checks will be implemented separately under FF-10.

## 9. Shared Package Location

```text
packages/
  shared/
    src/
      index.ts
      workflow.types.ts
      workflow.schema.ts
```

The frontend and backend should use this shared contract to maintain consistency.

## 10. DAG Structural Validation (FF-10)

The workflow engine validates workflow graphs using Depth-First Search (DFS).

### Validation Rules

- Exactly one Start node is required.
- At least one End node is required.
- Duplicate node IDs and edge IDs are rejected.
- Every edge must reference existing source and target nodes.
- Self-loops are rejected.
- Multi-node cycles are rejected.
- Every node must be reachable from the Start node.
- Multiple Start nodes are rejected.

Disconnected nodes are treated as errors because they cannot be reached from the workflow entry point.

### Algorithm and Complexity

The validator uses DFS with an adjacency list.

- Time complexity: O(V + E)
- Space complexity: O(V + E)

Where V represents the number of nodes and E represents the number of edges.

The validation result contains a boolean `valid` field and an array of structured `issues` identifying the relevant node or edge where possible.
