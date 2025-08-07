import type { BoardItem, BoardEdge, Task, CalendarEvent } from '@prisma/client'

export interface WorkflowNode {
  id: string
  externalId: string
  externalType: 'TASK' | 'EVENT'
  xPos: number
  yPos: number
  data: Task | CalendarEvent | null | undefined
}

export interface WorkflowEdge {
  id: string
  sourceId: string
  targetId: string
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface NodeStatus {
  id: string
  status: 'completed' | 'upcoming' | 'at-risk' | 'overdue'
  isCompleted: boolean
  dueDate?: Date
}

/**
 * Detects circular dependencies in the workflow graph
 * @param graph The workflow graph to check
 * @returns Array of node IDs that form circular dependencies, or empty array if none
 */
export function detectCircularDependencies(graph: WorkflowGraph): string[] {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const cycleNodes = new Set<string>()

  function hasCycleDFS(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      // Found a cycle - add all nodes in current path to cycle nodes
      cycleNodes.add(nodeId)
      return true
    }

    if (visited.has(nodeId)) {
      return false
    }

    visited.add(nodeId)
    recursionStack.add(nodeId)

    // Find all outgoing edges from this node
    const outgoingEdges = graph.edges.filter((edge) => edge.sourceId === nodeId)

    for (const edge of outgoingEdges) {
      if (hasCycleDFS(edge.targetId)) {
        cycleNodes.add(nodeId)
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  // Check all nodes as potential starting points
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      hasCycleDFS(node.id)
    }
  }

  return Array.from(cycleNodes)
}

/**
 * Validates if adding a new edge would create a circular dependency
 * @param graph The current workflow graph
 * @param sourceId ID of the source node
 * @param targetId ID of the target node
 * @returns true if the edge can be added safely, false if it would create a cycle
 */
export function canAddEdge(
  graph: WorkflowGraph,
  sourceId: string,
  targetId: string
): boolean {
  // Can't connect node to itself
  if (sourceId === targetId) {
    return false
  }

  // Check if edge already exists
  const edgeExists = graph.edges.some(
    (edge) => edge.sourceId === sourceId && edge.targetId === targetId
  )
  if (edgeExists) {
    return false
  }

  // Create temporary graph with the new edge
  const tempGraph: WorkflowGraph = {
    nodes: graph.nodes,
    edges: [...graph.edges, { id: 'temp', sourceId, targetId }],
  }

  // Check if this creates a cycle
  const cycles = detectCircularDependencies(tempGraph)
  return cycles.length === 0
}

/**
 * Gets the status of each node based on task/event completion and due dates
 * @param nodes Array of workflow nodes with their data
 * @returns Array of node statuses
 */
export function getNodeStatuses(nodes: WorkflowNode[]): NodeStatus[] {
  const now = new Date()
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  return nodes.map((node) => {
    let isCompleted = false
    let dueDate: Date | undefined
    let status: NodeStatus['status'] = 'upcoming'

    if (node.data) {
      if (node.externalType === 'TASK') {
        const task = node.data as Task
        isCompleted = task.status === 'COMPLETED'
        dueDate = task.dueDate || undefined

        if (isCompleted) {
          status = 'completed'
        } else if (dueDate) {
          if (dueDate < now) {
            status = 'overdue'
          } else if (dueDate <= twentyFourHoursFromNow) {
            status = 'at-risk'
          } else {
            status = 'upcoming'
          }
        } else {
          status = 'upcoming'
        }
      } else if (node.externalType === 'EVENT') {
        const event = node.data as CalendarEvent
        isCompleted = event.endsAt < now
        dueDate = event.startsAt

        if (isCompleted) {
          status = 'completed'
        } else if (event.startsAt <= twentyFourHoursFromNow) {
          status = 'at-risk'
        } else {
          status = 'upcoming'
        }
      }
    }

    return {
      id: node.id,
      status,
      isCompleted,
      dueDate,
    }
  })
}

/**
 * Calculates overall progress percentage for the workflow
 * @param nodeStatuses Array of node statuses
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(nodeStatuses: NodeStatus[]): number {
  if (nodeStatuses.length === 0) {
    return 0
  }

  const completedCount = nodeStatuses.filter(
    (status) => status.isCompleted
  ).length
  return Math.round((completedCount / nodeStatuses.length) * 100)
}

/**
 * Gets all predecessor nodes for a given node (nodes that must complete before this one)
 * @param graph The workflow graph
 * @param nodeId ID of the target node
 * @returns Array of predecessor node IDs
 */
export function getPredecessors(
  graph: WorkflowGraph,
  nodeId: string
): string[] {
  const predecessors = new Set<string>()

  function findPredecessorsDFS(currentNodeId: string) {
    // Find all edges that end at the current node
    const incomingEdges = graph.edges.filter(
      (edge) => edge.targetId === currentNodeId
    )

    for (const edge of incomingEdges) {
      if (!predecessors.has(edge.sourceId)) {
        predecessors.add(edge.sourceId)
        findPredecessorsDFS(edge.sourceId) // Recursively find predecessors
      }
    }
  }

  findPredecessorsDFS(nodeId)
  return Array.from(predecessors)
}

/**
 * Gets all successor nodes for a given node (nodes that depend on this one)
 * @param graph The workflow graph
 * @param nodeId ID of the source node
 * @returns Array of successor node IDs
 */
export function getSuccessors(graph: WorkflowGraph, nodeId: string): string[] {
  const successors = new Set<string>()

  function findSuccessorsDFS(currentNodeId: string) {
    // Find all edges that start from the current node
    const outgoingEdges = graph.edges.filter(
      (edge) => edge.sourceId === currentNodeId
    )

    for (const edge of outgoingEdges) {
      if (!successors.has(edge.targetId)) {
        successors.add(edge.targetId)
        findSuccessorsDFS(edge.targetId) // Recursively find successors
      }
    }
  }

  findSuccessorsDFS(nodeId)
  return Array.from(successors)
}

/**
 * Performs topological sort on the workflow graph
 * @param graph The workflow graph
 * @returns Array of node IDs in topological order, or null if graph has cycles
 */
export function topologicalSort(graph: WorkflowGraph): string[] | null {
  // Check for cycles first
  const cycles = detectCircularDependencies(graph)
  if (cycles.length > 0) {
    return null
  }

  const visited = new Set<string>()
  const result: string[] = []

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) {
      return
    }

    visited.add(nodeId)

    // Visit all successors first
    const outgoingEdges = graph.edges.filter((edge) => edge.sourceId === nodeId)
    for (const edge of outgoingEdges) {
      dfs(edge.targetId)
    }

    // Add current node to result (reverse order)
    result.unshift(nodeId)
  }

  // Process all nodes
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id)
    }
  }

  return result
}

/**
 * Finds the critical path in the workflow (longest path through the graph)
 * @param graph The workflow graph with node durations
 * @param getNodeDuration Function to get duration for a node in days
 * @returns Object with critical path nodes and total duration
 */
export function findCriticalPath(
  graph: WorkflowGraph,
  getNodeDuration: (nodeId: string) => number
): { path: string[]; totalDuration: number } | null {
  const sortedNodes = topologicalSort(graph)
  if (!sortedNodes) {
    return null // Graph has cycles
  }

  const distances = new Map<string, number>()
  const predecessors = new Map<string, string | null>()

  // Initialize distances
  for (const nodeId of sortedNodes) {
    distances.set(nodeId, 0)
    predecessors.set(nodeId, null)
  }

  // Calculate longest distances
  for (const nodeId of sortedNodes) {
    const currentDistance = distances.get(nodeId) || 0
    const nodeDuration = getNodeDuration(nodeId)

    // Update distances for all successors
    const outgoingEdges = graph.edges.filter((edge) => edge.sourceId === nodeId)
    for (const edge of outgoingEdges) {
      const newDistance = currentDistance + nodeDuration
      const currentTargetDistance = distances.get(edge.targetId) || 0

      if (newDistance > currentTargetDistance) {
        distances.set(edge.targetId, newDistance)
        predecessors.set(edge.targetId, nodeId)
      }
    }
  }

  // Find the node with maximum distance (end of critical path)
  let maxDistance = 0
  let endNode: string | null = null

  for (const [nodeId, distance] of distances.entries()) {
    const nodeDuration = getNodeDuration(nodeId)
    const totalDistance = distance + nodeDuration

    if (totalDistance > maxDistance) {
      maxDistance = totalDistance
      endNode = nodeId
    }
  }

  if (!endNode) {
    return { path: [], totalDuration: 0 }
  }

  // Reconstruct path
  const path: string[] = []
  let currentNode: string | null = endNode

  while (currentNode) {
    path.unshift(currentNode)
    currentNode = predecessors.get(currentNode) || null
  }

  return {
    path,
    totalDuration: maxDistance,
  }
}

/**
 * Validates the entire workflow graph for consistency
 * @param graph The workflow graph to validate
 * @returns Validation result with any errors found
 */
export function validateWorkflowGraph(graph: WorkflowGraph): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for circular dependencies
  const cycles = detectCircularDependencies(graph)
  if (cycles.length > 0) {
    errors.push(`Circular dependencies detected in nodes: ${cycles.join(', ')}`)
  }

  // Check that all edge endpoints exist as nodes
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.sourceId)) {
      errors.push(
        `Edge ${edge.id} references non-existent source node: ${edge.sourceId}`
      )
    }
    if (!nodeIds.has(edge.targetId)) {
      errors.push(
        `Edge ${edge.id} references non-existent target node: ${edge.targetId}`
      )
    }
  }

  // Check for duplicate edges
  const edgeSignatures = new Set<string>()
  for (const edge of graph.edges) {
    const signature = `${edge.sourceId}->${edge.targetId}`
    if (edgeSignatures.has(signature)) {
      errors.push(`Duplicate edge detected: ${signature}`)
    }
    edgeSignatures.add(signature)
  }

  // Check for self-loops
  for (const edge of graph.edges) {
    if (edge.sourceId === edge.targetId) {
      errors.push(`Self-loop detected on node: ${edge.sourceId}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
