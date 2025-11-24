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
  NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Save, Grid3X3, GitBranch, Circle, Maximize, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyLayout } from '@/lib/utils/treeLayouts'

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

type LayoutType = 'vertical' | 'horizontal' | 'radial' | 'compact' | 'force'

const nodeTypes = {
  person: PersonNode,
}

const LAYOUT_OPTIONS: Array<{ value: LayoutType; label: string; icon: any }> = [
  { value: 'vertical', label: 'Вертикальное', icon: GitBranch },
  { value: 'horizontal', label: 'Горизонтальное', icon: Workflow },
  { value: 'radial', label: 'Круговое', icon: Circle },
  { value: 'compact', label: 'Сетка', icon: Grid3X3 },
  { value: 'force', label: 'Физическое', icon: Maximize },
]

export function TreeCanvas({ persons, relations, treeId }: TreeCanvasProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('vertical')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Load saved layout preference
  useEffect(() => {
    const savedLayout = localStorage.getItem(`tree-layout-${treeId}`)
    if (savedLayout && LAYOUT_OPTIONS.find((o) => o.value === savedLayout)) {
      setLayoutType(savedLayout as LayoutType)
    }
  }, [treeId])

  // Calculate initial positions based on layout
  const getInitialPositions = useCallback(
    (layout: LayoutType) => {
      const hasPositions = persons.some((p) => p.position_x !== 0 || p.position_y !== 0)

      // If persons have saved positions and we're using the same layout, use them
      if (hasPositions) {
        return persons.map((p) => ({ id: p.id, x: p.position_x, y: p.position_y }))
      }

      // Otherwise, calculate new positions
      return applyLayout(persons, relations, layout)
    },
    [persons, relations]
  )

  // Convert persons to nodes
  const initialNodes: Node[] = useMemo(() => {
    const positions = getInitialPositions(layoutType)

    return persons.map((person) => {
      const pos = positions.find((p) => p.id === person.id)

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
        },
      }
    })
  }, [persons, treeId, layoutType, getInitialPositions])

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

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  // Save positions to database
  const savePositions = async () => {
    setSaving(true)
    setSaveStatus('saving')

    try {
      const positions = nodes.map((node) => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
      }))

      const response = await fetch(`/api/tree/${treeId}/save-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positions }),
      })

      if (!response.ok) {
        throw new Error('Failed to save positions')
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving positions:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Auto-save on drag end
  const onNodeDragStop: NodeDragHandler = useCallback(() => {
    // Debounce auto-save
    const timeoutId = setTimeout(() => {
      savePositions()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [nodes])

  // Handle layout change
  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayoutType(newLayout)
    localStorage.setItem(`tree-layout-${treeId}`, newLayout)

    // Apply new layout
    const newPositions = applyLayout(persons, relations, newLayout)
    const updatedNodes = nodes.map((node) => {
      const pos = newPositions.find((p) => p.id === node.id)
      return {
        ...node,
        position: {
          x: pos?.x || node.position.x,
          y: pos?.y || node.position.y,
        },
      }
    })

    setNodes(updatedNodes)

    // Auto-save new layout
    setTimeout(() => {
      savePositions()
    }, 500)
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] bg-gray-50 rounded-xl border border-gray-200">
      {/* Layout Selector */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
        <div className="text-xs font-semibold text-gray-600 mb-2 px-2">Вид дерева</div>
        <div className="flex flex-col gap-1">
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => handleLayoutChange(option.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  layoutType === option.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={savePositions}
          disabled={saving}
          size="sm"
          className={`${
            saveStatus === 'saved'
              ? 'bg-green-600 hover:bg-green-700'
              : saveStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : ''
          }`}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveStatus === 'saving'
            ? 'Сохранение...'
            : saveStatus === 'saved'
            ? 'Сохранено!'
            : saveStatus === 'error'
            ? 'Ошибка'
            : 'Сохранить позиции'}
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
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
