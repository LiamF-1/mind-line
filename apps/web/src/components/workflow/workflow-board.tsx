'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  NodeChange,
  EdgeChange,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { TaskNode } from './task-node'
import { EventNode } from './event-node'
import { WorkflowSidebar } from './workflow-sidebar'
import { WorkflowHeader } from './workflow-header'
import { NodeContextMenu } from './node-context-menu'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import type { Task, CalendarEvent } from '@prisma/client'

// Define board types locally to avoid import issues
type Board = {
  id: string
  name: string
  description: string | null
  deadline: Date | null
  theme: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
}

type BoardItem = {
  id: string
  externalId: string
  externalType: 'TASK' | 'EVENT'
  xPos: number
  yPos: number
  boardId: string
  createdAt: Date
  updatedAt: Date
}

type BoardEdge = {
  id: string
  sourceId: string
  targetId: string
  boardId: string
  createdAt: Date
  updatedAt: Date
}
import {
  getNodeStatuses,
  canAddEdge,
  type WorkflowGraph,
} from '@/lib/workflow-graph'

const nodeTypes = {
  taskNode: TaskNode,
  eventNode: EventNode,
}

interface WorkflowBoardProps {
  boardId: string
}

interface EnhancedBoardItem extends BoardItem {
  data: Task | CalendarEvent | null | undefined
}

interface BoardWithData extends Board {
  items: EnhancedBoardItem[]
  edges: BoardEdge[]
}

function WorkflowBoardContent({ boardId }: WorkflowBoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    nodeData: {
      id: string
      type: 'TASK' | 'EVENT'
      data: Task | CalendarEvent | null
    } | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeData: null,
  })
  const reactFlowInstance = useReactFlow()
  const router = useRouter()

  // API queries and mutations
  const utils = trpc.useUtils()
  const {
    data: board,
    isLoading,
    refetch,
  } = trpc.board.getById.useQuery({ id: boardId })
  const { data: tasks } = trpc.task.list.useQuery()
  const { data: events } = trpc.event.list.useQuery()

  const addItemMutation = trpc.board.addItem.useMutation()
  const updatePositionMutation = trpc.board.updateItemPosition.useMutation()
  const addEdgeMutation = trpc.board.addEdge.useMutation()
  const removeEdgeMutation = trpc.board.removeEdge.useMutation()
  const removeItemMutation = trpc.board.removeItem.useMutation()

  // Convert board data to React Flow format
  const convertBoardToFlow = useCallback(
    (boardData: BoardWithData, selectedNodeId?: string | null) => {
      const nodeStatuses = getNodeStatuses(
        boardData.items.map((item) => ({
          id: item.id,
          externalId: item.externalId,
          externalType: item.externalType,
          xPos: item.xPos,
          yPos: item.yPos,
          data: item.data,
        }))
      )

      const statusMap = new Map(
        nodeStatuses.map((status) => [status.id, status.status])
      )

      const flowNodes: Node[] = boardData.items.map((item) => ({
        id: item.id,
        type: item.externalType === 'TASK' ? 'taskNode' : 'eventNode',
        position: { x: item.xPos, y: item.yPos },
        data: {
          [item.externalType === 'TASK' ? 'task' : 'event']: item.data,
          status: statusMap.get(item.id) || 'upcoming',
        },
        selected: selectedNodeId === item.id,
      }))

      const flowEdges: Edge[] = boardData.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }))

      return { nodes: flowNodes, edges: flowEdges }
    },
    []
  )

  // Update React Flow when board data changes
  useEffect(() => {
    if (board) {
      const { nodes: flowNodes, edges: flowEdges } = convertBoardToFlow(
        board,
        selectedNode
      )
      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [board, selectedNode, convertBoardToFlow, setNodes, setEdges])

  // Handle node position changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)

      // Handle position updates
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          updatePositionMutation.mutate({
            itemId: change.id,
            xPos: change.position.x,
            yPos: change.position.y,
          })
        }
      })
    },
    [onNodesChange, updatePositionMutation]
  )

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !board) {
        return
      }

      // Create workflow graph for validation
      const workflowGraph: WorkflowGraph = {
        nodes: board.items.map((item: any) => ({
          id: item.id,
          externalId: item.externalId,
          externalType: item.externalType,
          xPos: item.xPos,
          yPos: item.yPos,
          data: item.data,
        })),
        edges: board.edges.map((edge: any) => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
        })),
      }

      // Validate edge addition
      if (!canAddEdge(workflowGraph, connection.source, connection.target)) {
        return
      }

      // Add edge to database
      addEdgeMutation.mutate(
        {
          boardId,
          edge: {
            sourceId: connection.source,
            targetId: connection.target,
          },
        },
        {
          onSuccess: () => {
            refetch()
            utils.board.list.invalidate()
            utils.board.getStats.invalidate({ boardId })
          },
          onError: (error) => {},
        }
      )
    },
    [board, boardId, addEdgeMutation, refetch, utils]
  )

  // Handle edge deletions
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation()

      if (window.confirm('Remove this dependency?')) {
        removeEdgeMutation.mutate(
          { edgeId: edge.id },
          {
            onSuccess: () => {
              refetch()
              utils.board.list.invalidate()
              utils.board.getStats.invalidate({ boardId })
            },
            onError: (error) => {},
          }
        )
      }
    },
    [removeEdgeMutation, refetch, utils, boardId]
  )

  // Handle adding items from sidebar
  const handleAddItem = useCallback(
    (item: { externalId: string; externalType: 'TASK' | 'EVENT' }) => {
      // Calculate position near existing nodes
      let position = { x: 100, y: 100 }

      if (nodes.length > 0) {
        // Find the rightmost node and place new node to its right
        const rightmostNode = nodes.reduce((max: any, node: any) =>
          node.position.x > max.position.x ? node : max
        )

        // Place new node 300px to the right and slightly offset vertically
        position = {
          x: rightmostNode.position.x + 300,
          y: rightmostNode.position.y + (Math.random() - 0.5) * 100, // Random offset ±50px
        }
      } else {
        // If no nodes exist, use viewport center
        const viewport = reactFlowInstance.getViewport()
        position = reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        })
      }

      addItemMutation.mutate(
        {
          boardId,
          item: {
            ...item,
            xPos: position.x,
            yPos: position.y,
          },
        },
        {
          onSuccess: () => {
            // Refetch board data and invalidate related queries
            refetch()
            // Also invalidate the board list to update counts
            utils.board.list.invalidate()
          },
          onError: (error) => {},
        }
      )
    },
    [
      boardId,
      addItemMutation,
      refetch,
      reactFlowInstance,
      nodes,
      utils.board.list,
    ]
  )

  // Handle node deletion
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (
        window.confirm(
          'Remove this item from the board? This will also remove any connected dependencies.'
        )
      ) {
        removeItemMutation.mutate(
          { itemId: nodeId },
          {
            onSuccess: () => {
              refetch()
              utils.board.list.invalidate()
              utils.board.getStats.invalidate({ boardId })
              setSelectedNode(null)
            },
            onError: (error) => {},
          }
        )
      }
    },
    [removeItemMutation, refetch, utils, boardId]
  )

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  // Handle node context menu (right-click)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setSelectedNode(node.id)

      // Find the board item data
      const boardItem = board?.items.find((item: any) => item.id === node.id)
      if (!boardItem) return

      setContextMenu({
        isOpen: true,
        position: { x: event.clientX, y: event.clientY },
        nodeData: {
          id: node.id,
          type: boardItem.externalType,
          data: boardItem.data || null,
        },
      })
    },
    [board]
  )

  // Clear selection when clicking on canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Handle context menu close
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Handle edit item from context menu
  const handleEditItem = useCallback(
    (itemId: string, itemType: 'TASK' | 'EVENT') => {
      // Navigate to the appropriate page to edit the item
      if (itemType === 'TASK') {
        // Navigate to tasks page (where tasks can be edited)
        router.push('/tasks')
      } else {
        // Navigate to calendar page (where events can be edited)
        router.push('/calendar')
      }
    },
    [router]
  )

  // Handle keyboard shortcuts
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu((prev) => ({ ...prev, isOpen: false }))
        setSelectedNode(null)
      } else if (
        selectedNode &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault()
        handleDeleteNode(selectedNode)
      }
    },
    [selectedNode, handleDeleteNode]
  )

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading workflow board...</p>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Board not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <WorkflowSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        tasks={tasks || []}
        events={events || []}
        onAddItem={handleAddItem}
        boardItems={board.items}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <WorkflowHeader
          board={board}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          selectedNodeId={selectedNode}
          onDeleteNode={handleDeleteNode}
        />

        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="workflow-board"
          >
            <Background />
            <Controls />
            <MiniMap
              className="!border !border-gray-200 !bg-white !shadow-lg"
              nodeColor={(node) => {
                const status = node.data?.status
                switch (status) {
                  case 'completed':
                    return '#10b981'
                  case 'overdue':
                    return '#ef4444'
                  case 'at-risk':
                    return '#f59e0b'
                  default:
                    return '#3b82f6'
                }
              }}
            />
          </ReactFlow>

          {/* Context Menu */}
          <NodeContextMenu
            isOpen={contextMenu.isOpen}
            position={contextMenu.position}
            nodeData={contextMenu.nodeData}
            onClose={handleCloseContextMenu}
            onDelete={handleDeleteNode}
            onEdit={handleEditItem}
          />
        </div>
      </div>
    </div>
  )
}

export function WorkflowBoard({ boardId }: WorkflowBoardProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBoardContent boardId={boardId} />
    </ReactFlowProvider>
  )
}
