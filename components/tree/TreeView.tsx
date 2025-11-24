'use client'

import { useState } from 'react'
import { TreeCanvas } from './TreeCanvas'

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
  bio: string | null
}

interface Relation {
  id: string
  person1_id: string
  person2_id: string
  relation_type: string
}

interface TreeViewProps {
  persons: Person[]
  relations: Relation[]
}

export function TreeView({ persons, relations }: TreeViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree')

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Люди в дереве ({persons.length})
        </h2>
        <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'tree'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🌳 Дерево
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📋 Список
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <TreeCanvas persons={persons} relations={relations} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map((person) => (
            <div
              key={person.id}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3">
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt={person.first_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-lg">
                    {person.first_name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {person.first_name} {person.last_name}
                  </h3>
                  {person.birth_date && (
                    <p className="text-sm text-gray-600">
                      {person.is_alive ? 'Родился' : 'Жил'}:{' '}
                      {new Date(person.birth_date).toLocaleDateString('ru-RU')}
                      {person.death_date &&
                        ` - ${new Date(person.death_date).toLocaleDateString('ru-RU')}`}
                    </p>
                  )}
                  {person.bio && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {person.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
