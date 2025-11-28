'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
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
import { applyLayout } from '@/lib/utils/treeLayouts'

import PersonNode, { calculateNodeWidth, RelationType } from './PersonNode'
import { SpouseEdge, ParentChildEdge, SiblingEdge } from './FamilyEdge'
import { AddRelativeModal } from './AddRelativeModal'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name?: string | null
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
  marriage_date?: string | null
  divorce_date?: string | null
}

interface TreeCanvasProps {
  persons: Person[]
  relations: Relation[]
  treeId: string
  userRole?: 'owner' | 'editor' | 'viewer' | null
  linkedPersonId?: string | null
}

const nodeTypes = {
  person: PersonNode,
}

const edgeTypes = {
  spouse: SpouseEdge,
  parent_child: ParentChildEdge,
  sibling: SiblingEdge,
}

export function TreeCanvas({ persons, relations, treeId, userRole, linkedPersonId }: TreeCanvasProps) {

  // Modal state for adding relatives
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedRelationType, setSelectedRelationType] = useState<RelationType | null>(null)

  // Check if user can edit
  const canEdit = userRole === 'owner' || userRole === 'editor'

  // Handle adding a relative
  const handleAddRelative = useCallback((personId: string, relationType: RelationType) => {
    const person = persons.find(p => p.id === personId)
    if (person) {
      setSelectedPerson(person)
      setSelectedRelationType(relationType)
      setAddModalOpen(true)
    }
  }, [persons])

  // Calculate positions - always use classic layout
  const getPositions = useCallback(() => {
    // Always recalculate positions using classic layout
    return applyLayout(persons, relations, 'classic')
  }, [persons, relations])

  // Helper: find spouse of a person
  const findSpouse = useCallback((personId: string): string | undefined => {
    const spouseRelation = relations.find(
      r => (r.relation_type === 'spouse' || r.relation_type === 'ex_spouse') &&
           (r.person1_id === personId || r.person2_id === personId)
    )
    if (!spouseRelation) return undefined
    return spouseRelation.person1_id === personId ? spouseRelation.person2_id : spouseRelation.person1_id
  }, [relations])

  // Helper: check if a couple has children
  const coupleHasChildren = useCallback((person1Id: string, person2Id: string): boolean => {
    const childRelations = relations.filter(r => r.relation_type === 'parent_child')
    const children1 = new Set(childRelations.filter(r => r.person1_id === person1Id).map(r => r.person2_id))
    const children2 = new Set(childRelations.filter(r => r.person1_id === person2Id).map(r => r.person2_id))

    for (const childId of children1) {
      if (children2.has(childId)) return true
    }
    return false
  }, [relations])

  // Convert persons to nodes
  const initialNodes: Node[] = useMemo(() => {
    const positions = getPositions()

    return persons.map((person) => {
      const pos = positions.find((p) => p.id === person.id)
      const nodeWidth = calculateNodeWidth(person.first_name, person.last_name || undefined)

      return {
        id: person.id,
        type: 'person',
        position: {
          x: pos?.x || 0,
          y: pos?.y || 0,
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
          nodeWidth: nodeWidth,
          onAddRelative: canEdit ? handleAddRelative : undefined,
        },
      }
    })
  }, [persons, treeId, getPositions, canEdit, handleAddRelative])

  // Convert relations to edges with custom types
  const initialEdges: Edge[] = useMemo(() => {
    const parentChildEdges: Edge[] = []
    const spouseEdges: Edge[] = []
    const siblingEdges: Edge[] = []
    const otherEdges: Edge[] = []
    const processedChildren = new Set<string>() // Track children we've already drawn edges to

    relations.forEach((relation) => {
      const baseEdge = {
        id: relation.id,
        source: relation.person1_id,
        target: relation.person2_id,
      }

      if (relation.relation_type === 'spouse' || relation.relation_type === 'ex_spouse') {
        const hasChildren = coupleHasChildren(relation.person1_id, relation.person2_id)
        spouseEdges.push({
          ...baseEdge,
          type: 'spouse',
          data: {
            hasChildren,
            isDivorced: relation.relation_type === 'ex_spouse',
          },
        })
      } else if (relation.relation_type === 'parent_child') {
        const childId = relation.person2_id
        const parentId = relation.person1_id
        const spouseId = findSpouse(parentId)

        // Only draw one edge per child (avoid duplicates from both parents)
        // Use a key combining child + both parents to track
        const parentPairKey = spouseId
          ? [parentId, spouseId].sort().join('-') + '-' + childId
          : parentId + '-' + childId

        if (!processedChildren.has(parentPairKey)) {
          processedChildren.add(parentPairKey)
          parentChildEdges.push({
            ...baseEdge,
            type: 'parent_child',
            data: {
              spouseId,
            },
          })
        }
      } else if (relation.relation_type === 'sibling') {
        siblingEdges.push({
          ...baseEdge,
          type: 'sibling',
        })
      } else {
        otherEdges.push({
          ...baseEdge,
          type: 'smoothstep',
          style: {
            stroke: '#94a3b8',
            strokeWidth: 2,
          },
        })
      }
    })

    // Order: parent-child first, then sibling, then spouse (spouse on top so hearts are visible)
    return [...parentChildEdges, ...siblingEdges, ...otherEdges, ...spouseEdges]
  }, [relations, findSpouse, coupleHasChildren])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when persons/relations change
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Update edges when relations change
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className="relative w-full h-[calc(100vh-200px)] bg-gray-50 rounded-xl border border-gray-200">

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={false}
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

      {/* Add Relative Modal */}
      <AddRelativeModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        treeId={treeId}
        relatedPerson={selectedPerson}
        relationType={selectedRelationType}
        persons={persons}
        relations={relations}
      />
    </div>
  )
}
