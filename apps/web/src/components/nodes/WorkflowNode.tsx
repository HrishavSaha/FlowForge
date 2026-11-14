
import {
  GitBranch,
  Play,
  Square,
  Zap,
} from 'lucide-react'

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'

type WorkflowNodeData = {
  label: string
  description: string
}

type WorkflowNodeType = Node<
  WorkflowNodeData,
  'start' | 'action' | 'condition' | 'end'
>

const nodeConfig = {
  start: {
    title: 'START',
    description: 'Workflow trigger',
    className: 'start-node',
    Icon: Play,
  },
  action: {
    title: 'ACTION',
    description: 'Execute a task',
    className: 'action-node',
    Icon: Zap,
  },
  condition: {
    title: 'CONDITION',
    description: 'Evaluate a condition',
    className: 'condition-node',
    Icon: GitBranch,
  },
  end: {
    title: 'END',
    description: 'Complete workflow',
    className: 'end-node',
    Icon: Square,
  },
}

export default function WorkflowNode({
  data,
  type,
  selected,
}: NodeProps<WorkflowNodeType>) {
  const config = nodeConfig[type as keyof typeof nodeConfig]
  const Icon = config.Icon

  return (
    <div
      className={`custom-workflow-node ${config.className} ${
        selected ? 'selected' : ''
      }`}
    >
      {type !== 'start' && (
        <Handle
          type="target"
          position={Position.Left}
          className="workflow-handle"
        />
      )}

      <div className="custom-node-content">
        <div className="custom-node-icon">
          <Icon size={17} />
        </div>

        <div className="custom-node-text">
          <span>{config.title}</span>
          <strong>{data.label}</strong>
          <small>{data.description || config.description}</small>
        </div>
      </div>

      {type === 'condition' ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            className="workflow-handle condition-true-handle"
            style={{ top: '35%' }}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            className="workflow-handle condition-false-handle"
            style={{ top: '75%' }}
          />
          <span className="condition-label true-label">TRUE</span>
          <span className="condition-label false-label">FALSE</span>
        </>
      ) : type !== 'end' ? (
        <Handle
          type="source"
          position={Position.Right}
          className="workflow-handle"
        />
      ) : null}
    </div>
  )
}
