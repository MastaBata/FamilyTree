'use client'

import { memo } from 'react'
import { EdgeProps, useNodes, Node } from 'reactflow'

const STROKE_COLOR = '#94a3b8'
const STROKE_WIDTH = 2.5
const DEFAULT_NODE_WIDTH = 160
const NODE_HEIGHT = 78  // p-3 (12px) * 2 + content height (~54px)
const CONNECTOR_DROP = 35 // How far below the nodes the connector point is

// Get dynamic node width from node data
function getNodeWidth(node: Node): number {
  return (node.data as any)?.nodeWidth || DEFAULT_NODE_WIDTH
}

/**
 * Custom edge for spouse connections
 * Draws: horizontal line between spouses + vertical line down from center (only if has children)
 * Dashed line for divorced couples (ex_spouse)
 */
export const SpouseEdge = memo(({
  source,
  target,
  data,
  style = {},
}: EdgeProps) => {
  const nodes = useNodes()
  const sourceNode = nodes.find(n => n.id === source)
  const targetNode = nodes.find(n => n.id === target)

  if (!sourceNode || !targetNode) return null

  // Determine left and right node (don't assume source is left)
  const leftNode = sourceNode.position.x < targetNode.position.x ? sourceNode : targetNode
  const rightNode = sourceNode.position.x < targetNode.position.x ? targetNode : sourceNode

  // Calculate positions based on node positions with dynamic widths
  const leftNodeWidth = getNodeWidth(leftNode)
  const leftRight = leftNode.position.x + leftNodeWidth  // Right edge of left node
  const rightLeft = rightNode.position.x              // Left edge of right node
  const lineY = leftNode.position.y + NODE_HEIGHT / 2 // Middle of nodes

  // Center point between spouses (where vertical line drops)
  const centerX = (leftRight + rightLeft) / 2

  // Check if this is an ex-spouse (divorced)
  const isDivorced = data?.isDivorced

  // Path: just horizontal line between spouses
  // Vertical lines to children are drawn by ParentChildEdge
  const edgePath = `M ${leftRight} ${lineY} L ${rightLeft} ${lineY}`

  // Heart icon at center of spouse connection
  const heartSize = 18
  const heartX = centerX - heartSize / 2
  const heartY = lineY - heartSize / 2

  return (
    <g>
      <path
        d={edgePath}
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={isDivorced ? '8 4' : undefined}
        style={style}
      />
      {/* Heart symbol at connection center - larger white background to cover crossing lines */}
      {!isDivorced && (
        <g transform={`translate(${heartX}, ${heartY})`} style={{ pointerEvents: 'none' }}>
          <circle cx={heartSize/2} cy={heartSize/2} r={heartSize/2 + 6} fill="white" />
          <path
            d={`M${heartSize/2} ${heartSize * 0.85}
               C${heartSize * 0.15} ${heartSize * 0.55}, ${heartSize * 0.15} ${heartSize * 0.25}, ${heartSize/2} ${heartSize * 0.35}
               C${heartSize * 0.85} ${heartSize * 0.25}, ${heartSize * 0.85} ${heartSize * 0.55}, ${heartSize/2} ${heartSize * 0.85}Z`}
            fill="#ec4899"
          />
        </g>
      )}
      {/* Broken heart for divorced */}
      {isDivorced && (
        <g transform={`translate(${heartX}, ${heartY})`} style={{ pointerEvents: 'none' }}>
          <circle cx={heartSize/2} cy={heartSize/2} r={heartSize/2 + 6} fill="white" />
          <path
            d={`M${heartSize/2} ${heartSize * 0.85}
               C${heartSize * 0.15} ${heartSize * 0.55}, ${heartSize * 0.15} ${heartSize * 0.25}, ${heartSize/2} ${heartSize * 0.35}
               C${heartSize * 0.85} ${heartSize * 0.25}, ${heartSize * 0.85} ${heartSize * 0.55}, ${heartSize/2} ${heartSize * 0.85}Z`}
            fill="#9ca3af"
          />
          <line x1={heartSize * 0.35} y1={heartSize * 0.25} x2={heartSize * 0.65} y2={heartSize * 0.75} stroke="white" strokeWidth="1.5" />
        </g>
      )}
    </g>
  )
})
SpouseEdge.displayName = 'SpouseEdge'

/**
 * Custom edge for parent-child connections
 * Draws complete path from parent (or spouse connector) to child
 */
export const ParentChildEdge = memo(({
  source,
  target,
  data,
  style = {},
}: EdgeProps) => {
  const nodes = useNodes()

  const sourceNode = nodes.find(n => n.id === source)
  const targetNode = nodes.find(n => n.id === target)

  if (!sourceNode || !targetNode) return null

  const sourceNodeWidth = getNodeWidth(sourceNode)
  const targetNodeWidth = getNodeWidth(targetNode)

  // Calculate parent center X and start Y based on whether there's a spouse
  let parentCenterX = sourceNode.position.x + sourceNodeWidth / 2
  let startY = sourceNode.position.y + NODE_HEIGHT  // Bottom of parent node

  if (data?.spouseId) {
    const spouseNode = nodes.find(n => n.id === data.spouseId)
    if (spouseNode) {
      // Determine which node is on the left
      const leftNode = sourceNode.position.x < spouseNode.position.x ? sourceNode : spouseNode
      const rightNode = sourceNode.position.x < spouseNode.position.x ? spouseNode : sourceNode

      // Same calculation as SpouseEdge centerX with dynamic width
      const leftNodeWidth = getNodeWidth(leftNode)
      const leftRight = leftNode.position.x + leftNodeWidth
      const rightLeft = rightNode.position.x
      parentCenterX = (leftRight + rightLeft) / 2

      // Start from middle of nodes (where spouse line is)
      startY = sourceNode.position.y + NODE_HEIGHT / 2
    }
  }

  // Target position - always center of child with dynamic width
  const targetX = targetNode.position.x + targetNodeWidth / 2
  const targetY = targetNode.position.y

  // The horizontal connector line is 25px above children
  const connectorLineY = targetY - 25

  // Build the complete path
  let edgePath: string

  if (Math.abs(parentCenterX - targetX) < 5) {
    // Child is directly below parent - just draw vertical line
    edgePath = `M ${parentCenterX} ${startY} L ${parentCenterX} ${targetY}`
  } else {
    // Child is offset - draw: down to connector line, horizontal, down to child
    edgePath = `
      M ${parentCenterX} ${startY}
      L ${parentCenterX} ${connectorLineY}
      L ${targetX} ${connectorLineY}
      L ${targetX} ${targetY}
    `
  }

  return (
    <path
      d={edgePath}
      fill="none"
      stroke={STROKE_COLOR}
      strokeWidth={STROKE_WIDTH}
      style={style}
    />
  )
})
ParentChildEdge.displayName = 'ParentChildEdge'

/**
 * Custom edge for sibling connections (when parents are not in the tree)
 * Draws: horizontal line above siblings + vertical lines down to each sibling
 */
export const SiblingEdge = memo(({
  source,
  target,
  style = {},
}: EdgeProps) => {
  const nodes = useNodes()
  const sourceNode = nodes.find(n => n.id === source)
  const targetNode = nodes.find(n => n.id === target)

  if (!sourceNode || !targetNode) return null

  // Determine left and right node
  const leftNode = sourceNode.position.x < targetNode.position.x ? sourceNode : targetNode
  const rightNode = sourceNode.position.x < targetNode.position.x ? targetNode : sourceNode

  const leftNodeWidth = getNodeWidth(leftNode)
  const rightNodeWidth = getNodeWidth(rightNode)

  // Center X of each sibling
  const leftCenterX = leftNode.position.x + leftNodeWidth / 2
  const rightCenterX = rightNode.position.x + rightNodeWidth / 2

  // Horizontal connector line 25px above the nodes
  const connectorY = leftNode.position.y - 25
  const topY = leftNode.position.y

  // Path: horizontal line between siblings + vertical lines down to each
  const edgePath = `
    M ${leftCenterX} ${connectorY}
    L ${rightCenterX} ${connectorY}
    M ${leftCenterX} ${connectorY}
    L ${leftCenterX} ${topY}
    M ${rightCenterX} ${connectorY}
    L ${rightCenterX} ${topY}
  `

  return (
    <path
      d={edgePath}
      fill="none"
      stroke={STROKE_COLOR}
      strokeWidth={STROKE_WIDTH}
      style={style}
    />
  )
})
SiblingEdge.displayName = 'SiblingEdge'
