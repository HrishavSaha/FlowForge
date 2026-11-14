
import { useRef, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import type { WorkflowExport } from '../../types/workflow-serialization'
import { validateWorkflow } from '../../types/workflow-validation'
import '@xyflow/react/dist/style.css'

import WorkflowNode from '../nodes/WorkflowNode'

type WorkflowNodeKind = 'start' | 'action' | 'condition' | 'end'

type WorkflowNodeData = {
  label: string
  description: string
  retries: number
  compensation: string
  condition: string
}

type WorkflowCanvasNode = Node<WorkflowNodeData>

const nodeTypes = {
  start: WorkflowNode,
  action: WorkflowNode,
  condition: WorkflowNode,
  end: WorkflowNode,
}

const initialNodes: WorkflowCanvasNode[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 100, y: 160 },
    data: {
      label: 'Start Workflow',
      description: 'Entry point',
      retries: 0,
      compensation: '',
      condition: '',
    },
  },
  {
    id: '2',
    type: 'action',
    position: { x: 390, y: 160 },
    data: {
      label: 'Process Action',
      description: 'Execute your first task',
      retries: 3,
      compensation: '',
      condition: '',
    },
  },
  {
    id: '3',
    type: 'end',
    position: { x: 680, y: 160 },
    data: {
      label: 'End Workflow',
      description: 'Workflow completed',
      retries: 0,
      compensation: '',
      condition: '',
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#9675f5', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: { stroke: '#9675f5', strokeWidth: 2 },
  },
]

export default function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<WorkflowCanvasNode>(initialNodes)

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges)
  const validationIssues = validateWorkflow(nodes, edges)

const errorCount = validationIssues.filter(
  (issue) => issue.severity === 'error',
).length

const warningCount = validationIssues.filter(
  (issue) => issue.severity === 'warning',
).length

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const nextId = useRef(4)

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onConnect = (connection: Connection) => {
    const isTrueBranch = connection.sourceHandle === 'true'
    const isFalseBranch = connection.sourceHandle === 'false'

    const edgeColor = isTrueBranch
      ? '#55d6a3'
      : isFalseBranch
        ? '#ef858b'
        : '#9675f5'

    const edgeLabel = isTrueBranch
      ? 'TRUE'
      : isFalseBranch
        ? 'FALSE'
        : undefined

    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `edge-${connection.source}-${connection.sourceHandle ?? 'default'}-${connection.target}-${Date.now()}`,
          type: 'smoothstep',
          animated: true,
          label: edgeLabel,
          labelStyle: {
            fill: edgeColor,
            fontSize: 10,
            fontWeight: 700,
          },
          labelBgStyle: {
            fill: '#191923',
            fillOpacity: 1,
          },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
          },
        },
        currentEdges,
      ),
    )
  }

  const addNode = (label: string, type: WorkflowNodeKind) => {
    const id = String(nextId.current++)

    const descriptions: Record<WorkflowNodeKind, string> = {
      start: 'Workflow entry point',
      action: 'Configure an action',
      condition: 'Evaluate a condition',
      end: 'Workflow completion',
    }

    const newNode: WorkflowCanvasNode = {
      id,
      type,
      position: {
        x: 180 + (nodes.length % 3) * 230,
        y: 330 + Math.floor(nodes.length / 3) * 130,
      },
      data: {
        label,
        description: descriptions[type],
        retries: type === 'action' ? 3 : 0,
        compensation: '',
        condition: '',
      },
    }

    setNodes((currentNodes) => [...currentNodes, newNode])
    setSelectedNodeId(id)
  }

  const updateSelectedNode = (
    field: keyof WorkflowNodeData,
    value: string | number,
  ) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            }
          : node,
      ),
    )
  }
  const exportWorkflow = () => {
  const workflow: WorkflowExport = {
    id: 'workflow-' + Date.now(),
    name: 'My Workflow',
    version: 1,
    createdAt: new Date().toISOString(),
    nodes,
    edges,
  }

  const json = JSON.stringify(workflow, null, 2)

  const blob = new Blob([json], {
    type: 'application/json',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'flowforge-workflow.json'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
const importWorkflow = async (
  event: React.ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0]

  if (!file) return

  try {
    const text = await file.text()
    const workflow: unknown = JSON.parse(text)

    if (
      typeof workflow !== 'object' ||
      workflow === null ||
      !('nodes' in workflow) ||
      !('edges' in workflow) ||
      !Array.isArray(workflow.nodes) ||
      !Array.isArray(workflow.edges)
    ) {
      throw new Error('Invalid workflow JSON structure.')
    }

    const importedNodes = workflow.nodes as WorkflowCanvasNode[]
    const importedEdges = workflow.edges as Edge[]

    if (
      importedNodes.some(
        (node) =>
          !node ||
          typeof node.id !== 'string' ||
          !['start', 'action', 'condition', 'end'].includes(
            node.type ?? '',
          ) ||
          !node.data ||
          typeof node.data.label !== 'string',
      ) ||
      importedEdges.some(
        (edge) =>
          !edge ||
          typeof edge.id !== 'string' ||
          typeof edge.source !== 'string' ||
          typeof edge.target !== 'string',
      )
    ) {
      throw new Error('The JSON contains invalid nodes or connections.')
        }

    const importIssues = validateWorkflow(importedNodes, importedEdges)
    const importErrors = importIssues.filter(
      (issue) => issue.severity === 'error',
    )

if (importErrors.length > 0) {
  throw new Error(
    'Import rejected:\n' +
      importErrors.map((issue) => issue.message).join('\n'),
  )
}

    setNodes(importedNodes)
    setEdges(importedEdges)
    setSelectedNodeId(null)

    nextId.current =
      Math.max(
        0,
        ...importedNodes.map((node) => Number(node.id) || 0),
      ) + 1

    window.alert('Workflow imported successfully!')
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : 'Unable to import workflow JSON.',
    )
  } finally {
    event.target.value = ''
  }
}

  return (
    <div className="workflow-editor">
      <div className="workflow-toolbar">
        <div>
          <span className="editor-eyebrow">VISUAL WORKFLOW BUILDER</span>
          <h2>Workflow Canvas</h2>
          <p>Connect steps to create your automation flow.</p>
        </div>

        <div className="editor-actions">
          <button onClick={() => addNode('Start Workflow', 'start')}>
            Start
          </button>
          <button onClick={() => addNode('Action Step', 'action')}>
            Action
          </button>
          <button onClick={() => addNode('Condition', 'condition')}>
            Condition
          </button>
          <button onClick={() => addNode('End Workflow', 'end')}>
            End
          </button>
          <button
  className="export-workflow-btn"
  onClick={exportWorkflow}
>
  Export JSON
</button>
<button
  className="import-workflow-btn"
  onClick={() => fileInputRef.current?.click()}
>
  Import JSON
</button>


<input
  ref={fileInputRef}
  type="file"
  accept=".json,application/json"
  style={{ display: 'none' }}
  onChange={importWorkflow}
/>

        </div>
      </div>

      <div className="workflow-workspace">
        <div className="workflow-canvas-area">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={1.5}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: '#9675f5', strokeWidth: 2 },
            }}
          >
            <Background color="#454052" gap={22} size={1} />
            <Controls />
            <MiniMap
              nodeColor="#9675f5"
              maskColor="rgba(10, 10, 18, 0.7)"
            />
            <Panel position="top-right" className="canvas-info">
              <span>{nodes.length} Nodes</span>
              <span>{edges.length} Connections</span>
            </Panel>
          </ReactFlow>
        </div>

        <aside className="node-config-panel">
          <div className="config-panel-heading">
            <div>
              <span className="editor-eyebrow">NODE SETTINGS</span>
              <h3>Configuration</h3>
            </div>
            <span className="config-settings-icon">⚙</span>
          </div>

          {selectedNode ? (
            <div className="config-form">
              <div className="selected-node-type">
                <span>SELECTED NODE</span>
                <strong>{selectedNode.type?.toUpperCase()}</strong>
              </div>

              <label>
                Node Name
                <input
                  value={selectedNode.data.label}
                  onChange={(event) =>
                    updateSelectedNode('label', event.target.value)
                  }
                  placeholder="Enter node name"
                />
              </label>

              <label>
                Description
                <textarea
                  value={selectedNode.data.description}
                  onChange={(event) =>
                    updateSelectedNode('description', event.target.value)
                  }
                  placeholder="Describe this node"
                  rows={3}
                />
              </label>

              {selectedNode.type === 'action' && (
                <>
                  <label>
                    Retry Count
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={selectedNode.data.retries}
                      onChange={(event) =>
                        updateSelectedNode(
                          'retries',
                          Math.min(10, Math.max(0, Number(event.target.value))),
                        )
                      }
                    />
                    <small>Number of retry attempts after failure.</small>
                  </label>

                  <label>
                    Compensation Action
                    <input
                      value={selectedNode.data.compensation}
                      onChange={(event) =>
                        updateSelectedNode('compensation', event.target.value)
                      }
                      placeholder="e.g. RefundPayment"
                    />
                    <small>Action to execute if this step needs rollback.</small>
                  </label>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <label>
                  Condition Expression
                  <textarea
                    value={selectedNode.data.condition}
                    onChange={(event) =>
                      updateSelectedNode('condition', event.target.value)
                    }
                    placeholder="e.g. payment.status === 'success'"
                    rows={3}
                  />
                  <small>Expression used to evaluate the TRUE/FALSE branch.</small>
                </label>
              )}
            </div>
          ) : (
            <div className="config-empty-state">
              <div className="config-empty-icon">⌘</div>
              <strong>No node selected</strong>
              <p>Select a node on the canvas to configure its properties.</p>
            </div>
          )}

          {selectedNode && (
            <div className="config-panel-footer">
              <span className="config-save-indicator" />
              Changes applied locally
            </div>
          )}
        </aside>
      </div>
            <section className="validation-panel">
        <div className="validation-panel-header">
          <div>
            <h3>Workflow Validation</h3>
            <p>Check your workflow structure before execution.</p>
          </div>

          <div className="validation-summary">
            <span className="validation-error-count">
              {errorCount} Errors
            </span>
            <span className="validation-warning-count">
              {warningCount} Warnings
            </span>
          </div>
        </div>

        <div className="validation-issues">
          {validationIssues.length === 0 ? (
            <p className="validation-success">
              ✓ No validation issues found. Your workflow structure looks good.
            </p>
          ) : (
            validationIssues.map((issue) => (
              <div
                key={issue.id}
                className={`validation-issue ${issue.severity}`}
              >
                <span>
                  {issue.severity === 'error' ? '✕' : '⚠'}
                </span>
                <p>{issue.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
