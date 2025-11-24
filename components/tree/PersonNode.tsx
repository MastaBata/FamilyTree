'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface PersonNodeData {
  firstName: string
  lastName?: string
  birthDate?: string
  deathDate?: string
  isAlive: boolean
  avatarUrl?: string
  gender?: string
}

function PersonNode({ data }: NodeProps<PersonNodeData>) {
  const initials = data.firstName[0] + (data.lastName?.[0] || '')
  const fullName = `${data.firstName} ${data.lastName || ''}`.trim()

  const years = (() => {
    if (!data.birthDate) return null
    const birthYear = new Date(data.birthDate).getFullYear()
    if (data.isAlive) return `${birthYear}`
    if (data.deathDate) {
      const deathYear = new Date(data.deathDate).getFullYear()
      return `${birthYear} - ${deathYear}`
    }
    return birthYear
  })()

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div className="bg-white rounded-lg shadow-md p-3 border-2 border-primary-200 hover:border-primary-400 transition-colors min-w-[160px]">
        <div className="flex items-center gap-2">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={fullName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                data.gender === 'male'
                  ? 'bg-blue-500'
                  : data.gender === 'female'
                  ? 'bg-pink-500'
                  : 'bg-gray-500'
              }`}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {fullName}
            </p>
            {years && (
              <p className="text-xs text-gray-600">{years}</p>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

export default memo(PersonNode)
