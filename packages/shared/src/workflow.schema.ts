
import { z } from 'zod'

export const nodeIdSchema = z
  .string()
  .trim()
  .min(1, 'Node ID cannot be empty')

export const workflowNodeTypeSchema = z.enum([
  'start',
  'action',
  'condition',
  'end',
])

export const workflowNodeConfigSchema = z.object({
  label: z.string().trim().min(1, 'Node label is required'),
  description: z.string(),
  retries: z.number().int().min(0).max(10),
  compensation: z.string(),
  condition: z.string(),
})

export const workflowNodeSchema = z.object({
  id: nodeIdSchema,
  type: workflowNodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: workflowNodeConfigSchema,
})

export const workflowEdgeSchema = z.object({
  id: z.string().trim().min(1, 'Edge ID cannot be empty'),
  source: nodeIdSchema,
  target: nodeIdSchema,
  sourceHandle: z.enum(['true', 'false']).nullable().optional(),
  targetHandle: z.string().nullable().optional(),
})

export const workflowGraphSchema = z.object({
  id: z.string().trim().min(1, 'Workflow ID is required'),
  name: z.string().trim().min(1, 'Workflow name is required'),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
})

export type WorkflowGraphInput = z.infer<
  typeof workflowGraphSchema
>
export const workflowValidationIssueSchema = z.object({
  id: z.string().trim().min(1),
  severity: z.enum(['error', 'warning']),
  message: z.string().min(1),
  nodeId: nodeIdSchema.optional(),
  edgeId: z.string().trim().min(1).optional(),
})

export const workflowValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(workflowValidationIssueSchema),
})