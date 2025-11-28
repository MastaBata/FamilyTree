'use client'

import { memo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Handle, Position, NodeProps } from 'reactflow'
import { Plus, Heart, Baby, Users, UserPlus, Info } from 'lucide-react'

export type RelationType = 'spouse' | 'child' | 'parent' | 'sibling'

interface PersonNodeData {
  personId: string
  treeId: string
  firstName: string
  lastName?: string
  birthDate?: string
  deathDate?: string
  isAlive: boolean
  avatarUrl?: string
  gender?: string
  nodeWidth?: number
  onAddRelative?: (personId: string, relationType: RelationType) => void
}

// Calculate node width based on name length
export function calculateNodeWidth(firstName: string, lastName?: string): number {
  const fullName = `${firstName} ${lastName || ''}`.trim()
  // Base width: avatar (48px) + padding left (12px) + gap (12px) + padding right (16px) = 88px
  // Text: approximately 8px per character for 14px font
  const textWidth = fullName.length * 8
  const minWidth = 150
  const maxWidth = 300
  return Math.min(maxWidth, Math.max(minWidth, 88 + textWidth))
}

const relationOptions = [
  { type: 'spouse' as RelationType, label: 'Супруг(а)', icon: Heart },
  { type: 'child' as RelationType, label: 'Ребёнок', icon: Baby },
  { type: 'parent' as RelationType, label: 'Родитель', icon: Users },
  { type: 'sibling' as RelationType, label: 'Брат/Сестра', icon: UserPlus },
]

function PersonNode({ data }: NodeProps<PersonNodeData>) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 160 })
  const initials = data.firstName[0] + (data.lastName?.[0] || '')
  const fullName = `${data.firstName} ${data.lastName || ''}`.trim()
  const nodeWidth = data.nodeWidth || calculateNodeWidth(data.firstName, data.lastName)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/tree/${data.treeId}/person/${data.personId}`)
  }

  // Format years display
  const getYearsDisplay = () => {
    if (!data.birthDate) return null
    const birthYear = new Date(data.birthDate).getFullYear()
    if (!data.isAlive && data.deathDate) {
      const deathYear = new Date(data.deathDate).getFullYear()
      return `${birthYear} — ${deathYear}`
    }
    return `${birthYear}`
  }

  const yearsDisplay = getYearsDisplay()

  // Border and background colors based on gender and alive status
  const getBorderColor = () => {
    if (!data.isAlive) return 'border-gray-300'
    if (data.gender === 'male') return 'border-blue-300 hover:border-blue-400'
    if (data.gender === 'female') return 'border-pink-300 hover:border-pink-400'
    return 'border-gray-300 hover:border-gray-400'
  }

  const getAvatarBgColor = () => {
    if (!data.isAlive) {
      if (data.gender === 'male') return 'bg-blue-300'
      if (data.gender === 'female') return 'bg-pink-300'
      return 'bg-gray-400'
    }
    if (data.gender === 'male') return 'bg-blue-500'
    if (data.gender === 'female') return 'bg-pink-500'
    return 'bg-gray-500'
  }

  return (
    <>
      {/* Hidden handles for connections */}
      <Handle type="target" position={Position.Top} id="top" className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!opacity-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!opacity-0 !w-0 !h-0" />

      <div className="group relative">
        <div
          className={`bg-white rounded-xl shadow-lg p-3 border-2 transition-all ${getBorderColor()} ${!data.isAlive ? 'opacity-80' : ''}`}
          style={{ width: nodeWidth }}
        >
          <div className="flex items-center gap-3">
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={fullName}
                className={`w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow ${!data.isAlive ? 'grayscale' : ''}`}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow ${getAvatarBgColor()}`}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm leading-tight ${!data.isAlive ? 'text-gray-600' : 'text-gray-900'}`}>
                {fullName}
              </p>
              {yearsDisplay && (
                <p className={`text-xs mt-0.5 ${!data.isAlive ? 'text-gray-400' : 'text-gray-500'}`}>
                  {!data.isAlive && <span className="mr-1">†</span>}
                  {yearsDisplay}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info button - visible on hover */}
        <button
          onClick={handleClick}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
          title="Информация"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* Add relative button - visible on hover, only if user has permission */}
        {data.onAddRelative && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              const btn = e.target as HTMLElement
              const card = btn.closest('.group')?.querySelector('.bg-white.rounded-lg') as HTMLElement
              const cardRect = card?.getBoundingClientRect()
              const btnRect = btn.getBoundingClientRect()
              setMenuPosition({
                x: cardRect ? cardRect.left + cardRect.width / 2 : btnRect.left + btnRect.width / 2,
                y: btnRect.bottom + 8,
                width: cardRect ? cardRect.width : 160
              })
              setShowMenu(!showMenu)
            }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-6 h-6 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
            title="Добавить родственника"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Popup menu via portal */}
        {showMenu && typeof document !== 'undefined' && createPortal(
          <>
            {/* Backdrop to catch clicks */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setShowMenu(false)}
            />
            {/* Menu */}
            <div
              className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 py-2"
              style={{
                left: menuPosition.x,
                top: menuPosition.y,
                width: menuPosition.width,
                transform: 'translateX(-50%)',
              }}
            >
              {relationOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.type}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      if (data.onAddRelative) {
                        data.onAddRelative(data.personId, option.type)
                      }
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Bottom handle for outgoing child connections */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!opacity-0 !w-0 !h-0" />
    </>
  )
}

export default memo(PersonNode)
