
/**
 * Unique identifier for a workflow node.
 */
export type NodeId = string

/**
 * Supported workflow node types.
 */
export type WorkflowNodeType =
  | 'start'
  | 'action'
  | 'condition'
  | 'end'

/**
 * Configuration shared by workflow nodes.
 */
export interface WorkflowNodeConfig {
  label: string
  description: string
  retries: number
  compensation: string
  condition: string
}

/**
 * Workflow node structure.
 */
export interface WorkflowNode {
  id: NodeId
  type: WorkflowNodeType
  position: {
    x: number
    y: number
  }
  data: WorkflowNodeConfig
}

/**
 * Conditional branch metadata.
 */
export type ConditionalBranch = 'true' | 'false'

/**
 * Workflow edge structure.
 */
export interface WorkflowEdge {
  id: string
  source: NodeId
  target: NodeId
  sourceHandle?: ConditionalBranch | null
  targetHandle?: string | null
}

/**
 * Complete workflow graph.
 */
export interface WorkflowGraph {
  id: string
  name: string
  version: number
  createdAt: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * Standard workflow validation issue.
 */
export interface WorkflowValidationIssue {
  id: string
  severity: 'error' | 'warning'
  message: string
  nodeId?: NodeId
  edgeId?: string
}

/**
 * Workflow validation result.
 */
export interface WorkflowValidationResult {
  valid: boolean
  issues: WorkflowValidationIssue[]
}
