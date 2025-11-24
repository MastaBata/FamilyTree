'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'

import PersonNode from './PersonNode'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  birth_date: string | null
  death_date: string | null
  is_alive: boolean
  avatar_url: string | null
  gender: string | null
  position_x: number
  position_y: number
}

interface Relation {
  id: string
  person1_id: string
  person2_id: string
  relation_type: string
}

interface TreeCanvasProps {
  persons: Person[]
  relations: Relation[]
  treeId: string
}

const nodeTypes = {
  person: PersonNode,
}

export function TreeCanvas({ persons, relations, treeId }: TreeCanvasProps) {
  // Convert persons to nodes
  const initialNodes: Node[] = useMemo(
    () =>
      persons.map((person, index) => ({
        id: person.id,
        type: 'person',
        position: {
          x: person.position_x || index * 200,
          y: person.position_y || index * 150,
        },
        data: {
          personId: person.id,
          treeId: treeId,
          firstName: person.first_name,
          lastName: person.last_name,
          birthDate: person.birth_date,
          deathDate: person.death_date,
          isAlive: person.is_alive,
          avatarUrl: person.avatar_url,
          gender: person.gender,
        },
      })),
    [persons, treeId]
  )

  // Convert relations to edges
  const initialEdges: Edge[] = useMemo(
    () =>
      relations.map((relation) => ({
        id: relation.id,
        source: relation.person1_id,
        target: relation.person2_id,
        type: relation.relation_type === 'spouse' ? 'straight' : 'smoothstep',
        animated: relation.relation_type === 'spouse',
        style: {
          stroke: relation.relation_type === 'spouse' ? '#ec4899' : '#2196F3',
          strokeWidth: 2,
        },
        label: relation.relation_type === 'spouse' ? '💑' : undefined,
      })),
    [relations]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className="w-full h-[calc(100vh-200px)] bg-gray-50 rounded-xl border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const gender = (node.data as any).gender
            if (gender === 'male') return '#3b82f6'
            if (gender === 'female') return '#ec4899'
            return '#6b7280'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}
