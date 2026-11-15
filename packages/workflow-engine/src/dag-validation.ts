
import type {
  WorkflowGraph,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from '@flowforge/shared'

export function validateWorkflowDAG(
  graph: WorkflowGraph,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = []

  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  const adjacency = new Map<string, string[]>()

  // 1. Check duplicate node IDs
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        id: `duplicate-node-${node.id}`,
        severity: 'error',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      })
    } else {
      nodeIds.add(node.id)
      adjacency.set(node.id, [])
    }
  }

  // 2. Check duplicate edge IDs and edge references
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        id: `duplicate-edge-${edge.id}`,
        severity: 'error',
        message: `Duplicate edge ID: ${edge.id}`,
        edgeId: edge.id,
      })
    } else {
      edgeIds.add(edge.id)
    }

    if (!nodeIds.has(edge.source)) {
      issues.push({
        id: `missing-source-${edge.id}`,
        severity: 'error',
        message: `Edge ${edge.id} references a missing source node.`,
        edgeId: edge.id,
      })
      continue
    }

    if (!nodeIds.has(edge.target)) {
      issues.push({
        id: `missing-target-${edge.id}`,
        severity: 'error',
        message: `Edge ${edge.id} references a missing target node.`,
        edgeId: edge.id,
      })
      continue
    }

    if (edge.source === edge.target) {
      issues.push({
        id: `self-loop-${edge.id}`,
        severity: 'error',
        message: `Edge ${edge.id} creates a self-loop.`,
        nodeId: edge.source,
        edgeId: edge.id,
      })
      continue
    }

    adjacency.get(edge.source)?.push(edge.target)
  }

  // 3. Check Start and End nodes
  const startNodes = graph.nodes.filter(
    (node) => node.type === 'start',
  )

  const endNodes = graph.nodes.filter(
    (node) => node.type === 'end',
  )

  if (startNodes.length !== 1) {
    issues.push({
      id: 'invalid-start-count',
      severity: 'error',
      message: 'Workflow must contain exactly one Start node.',
    })
  }

  if (endNodes.length === 0) {
    issues.push({
      id: 'missing-end',
      severity: 'error',
      message: 'Workflow must contain at least one End node.',
    })
  }

  // 4. Detect cycles using DFS
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function detectCycle(nodeId: string): void {
    if (visiting.has(nodeId)) {
      issues.push({
        id: `cycle-${nodeId}`,
        severity: 'error',
        message: `Cycle detected involving node ${nodeId}.`,
        nodeId,
      })
      return
    }

    if (visited.has(nodeId)) return

    visiting.add(nodeId)

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      detectCycle(neighbor)
    }

    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      detectCycle(node.id)
    }
  }

  // 5. Check reachability from the Start node
  if (startNodes.length === 1) {
    const reachable = new Set<string>()

    function visit(nodeId: string): void {
      if (reachable.has(nodeId)) return

      reachable.add(nodeId)

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        visit(neighbor)
      }
    }

    visit(startNodes[0].id)

    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          id: `unreachable-${node.id}`,
          severity: 'error',
          message: `Node ${node.id} is not reachable from the Start node.`,
          nodeId: node.id,
        })
      }
    }
  }

  return {
    valid: !issues.some(
      (issue) => issue.severity === 'error',
    ),
    issues,
  }
}
