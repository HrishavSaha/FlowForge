
import type { Edge, Node } from '@xyflow/react'

export type WorkflowExportNodeData = {
  label: string
  description: string
  retries: number
  compensation: string
  condition: string
}

export type WorkflowExport = {
  id: string
  name: string
  version: number
  createdAt: string
  nodes: Node<WorkflowExportNodeData>[]
  edges: Edge[]
}
