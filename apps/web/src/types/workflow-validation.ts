
import type { Edge, Node } from '@xyflow/react'

export type ValidationIssue = {
  id: string
  severity: 'error' | 'warning'
  message: string
  nodeId?: string
  edgeId?: string
}

export function validateWorkflow(
  nodes: Node[],
  edges: Edge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const nodeIds = new Set<string>()
  const validNodeIds = new Set(nodes.map((node) => node.id))

  // 1. Check duplicate node IDs
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        id: `duplicate-${node.id}`,
        severity: 'error',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      })
    }

    nodeIds.add(node.id)
  }

  // 2. Check workflow start and end nodes
  const startNodes = nodes.filter((node) => node.type === 'start')
  const endNodes = nodes.filter((node) => node.type === 'end')

  if (startNodes.length === 0) {
    issues.push({
      id: 'missing-start',
      severity: 'error',
      message: 'Workflow must contain a Start node.',
    })
  }

  if (startNodes.length > 1) {
    issues.push({
      id: 'multiple-start',
      severity: 'error',
      message: 'Workflow should contain only one Start node.',
    })
  }

  if (endNodes.length === 0) {
    issues.push({
      id: 'missing-end',
      severity: 'error',
      message: 'Workflow must contain an End node.',
    })
  }

  // 3. Check invalid edge references
  for (const edge of edges) {
    if (
      !validNodeIds.has(edge.source) ||
      !validNodeIds.has(edge.target)
    ) {
      issues.push({
        id: `invalid-edge-${edge.id}`,
        severity: 'error',
        message: `Edge ${edge.id} references a missing node.`,
        edgeId: edge.id,
      })
    }
  }

  // 4. Check cycles using depth-first search
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    if (
      validNodeIds.has(edge.source) &&
      validNodeIds.has(edge.target)
    ) {
      adjacency.get(edge.source)?.push(edge.target)
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  let hasCycle = false

  function detectCycle(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visiting.add(nodeId)

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (detectCycle(neighbor)) return true
    }

    visiting.delete(nodeId)
    visited.add(nodeId)

    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && detectCycle(node.id)) {
      hasCycle = true
      break
    }
  }

  if (hasCycle) {
    issues.push({
      id: 'workflow-cycle',
      severity: 'error',
      message: 'Workflow contains a cycle. Check the node connections.',
    })
  }

  // 5. Warn about nodes without connections
  for (const node of nodes) {
    if (node.type === 'start') continue

    const hasIncoming = edges.some(
      (edge) => edge.target === node.id,
    )

    if (!hasIncoming) {
      issues.push({
        id: `unconnected-${node.id}`,
        severity: 'warning',
        message: `${node.data.label || node.id} has no incoming connection.`,
        nodeId: node.id,
      })
    }
  }

  return issues
}
