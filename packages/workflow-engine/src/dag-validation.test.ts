
import { describe, expect, it } from 'vitest'
import type { WorkflowGraph, WorkflowNode } from '@flowforge/shared'
import { validateWorkflowDAG } from './dag-validation'

function createNode(
  id: string,
  type: WorkflowNode['type'],
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      description: '',
      retries: 0,
      compensation: '',
      condition: '',
    },
  }
}

function createGraph(
  nodes: WorkflowNode[],
  edges: WorkflowGraph['edges'],
): WorkflowGraph {
  return {
    id: 'workflow-1',
    name: 'Test Workflow',
    version: 1,
    createdAt: new Date().toISOString(),
    nodes,
    edges,
  }
}

describe('validateWorkflowDAG', () => {
  it('accepts a valid acyclic workflow', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('action', 'action'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'action' },
        { id: 'e2', source: 'action', target: 'end' },
      ],
    )

    expect(validateWorkflowDAG(graph).valid).toBe(true)
  })

  it('rejects duplicate node IDs', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('start', 'action'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'duplicate-node-start',
    )).toBe(true)
  })

  it('rejects duplicate edge IDs', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'end' },
        { id: 'e1', source: 'start', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'duplicate-edge-e1',
    )).toBe(true)
  })

  it('rejects edges referencing missing nodes', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'missing' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'missing-target-e1',
    )).toBe(true)
  })


  it('rejects edges referencing a missing source node', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'missing', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'missing-source-e1',
    )).toBe(true)
  })


  it('rejects self-loops', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'start' },
        { id: 'e2', source: 'start', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'self-loop-e1',
    )).toBe(true)
  })

  it('rejects multi-node cycles', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('action', 'action'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start', target: 'action' },
        { id: 'e2', source: 'action', target: 'start' },
        { id: 'e3', source: 'action', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id.startsWith('cycle-'),
    )).toBe(true)
  })

  it('rejects disconnected nodes', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('end', 'end'),
        createNode('isolated', 'action'),
      ],
      [
        { id: 'e1', source: 'start', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'unreachable-isolated',
    )).toBe(true)
  })

  it('rejects multiple Start nodes', () => {
    const graph = createGraph(
      [
        createNode('start-1', 'start'),
        createNode('start-2', 'start'),
        createNode('end', 'end'),
      ],
      [
        { id: 'e1', source: 'start-1', target: 'end' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'invalid-start-count',
    )).toBe(true)
  })

  it('rejects a workflow without an End node', () => {
    const graph = createGraph(
      [
        createNode('start', 'start'),
        createNode('action', 'action'),
      ],
      [
        { id: 'e1', source: 'start', target: 'action' },
      ],
    )

    const result = validateWorkflowDAG(graph)

    expect(result.valid).toBe(false)
    expect(result.issues.some(
      (issue) => issue.id === 'missing-end',
    )).toBe(true)
  })
})
