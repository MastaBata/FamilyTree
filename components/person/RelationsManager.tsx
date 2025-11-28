'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
} from '@/components/ui/Modal'
import { Users, Heart, Plus, Trash2, Edit, X } from 'lucide-react'
import { handleSpouseRelationCreated, handleParentChildCreated } from '@/lib/utils/autoCreateRelations'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
}

interface Relation {
  id: string
  person1_id: string
  person2_id: string
  relation_type: string
  marriage_date: string | null
  divorce_date: string | null
  is_current: boolean
  person1: Person
  person2: Person
}

interface SimpleRelation {
  person1_id: string
  person2_id: string
  relation_type: string
}

interface RelationsManagerProps {
  personId: string
  treeId: string
  canEdit: boolean
  relations: Relation[]
  allPersons: Person[]
  allRelations: SimpleRelation[]
}

export function RelationsManager({
  personId,
  treeId,
  canEdit,
  relations: initialRelations,
  allPersons,
  allRelations,
}: RelationsManagerProps) {
  const router = useRouter()
  const [relations, setRelations] = useState<Relation[]>(initialRelations)

  // Delete relation from local state
  const handleDeleteRelation = (relationId: string) => {
    setRelations(prev => prev.filter(r => r.id !== relationId))
  }

  // Group relations
  const parents: { relation: Relation; person: Person }[] = []
  const children: { relation: Relation; person: Person }[] = []
  const spouses: { relation: Relation; person: Person }[] = []
  const siblings: { relation: Relation; person: Person }[] = []

  // Get my parent IDs for sibling detection
  const myParentIds: string[] = []

  relations.forEach((rel) => {
    if (rel.relation_type === 'parent_child') {
      if (rel.person2_id === personId) {
        parents.push({ relation: rel, person: rel.person1 })
        myParentIds.push(rel.person1_id)
      } else {
        children.push({ relation: rel, person: rel.person2 })
      }
    } else if (rel.relation_type === 'spouse' || rel.relation_type === 'ex_spouse') {
      const spouse = rel.person1_id === personId ? rel.person2 : rel.person1
      spouses.push({ relation: rel, person: spouse })
    } else if (rel.relation_type === 'sibling') {
      const sibling = rel.person1_id === personId ? rel.person2 : rel.person1
      siblings.push({ relation: rel, person: sibling })
    }
  })

  // Find siblings through common parents (people who have the same parents as me)
  if (myParentIds.length > 0) {
    // Find all people who share at least one parent with me using allRelations
    const siblingIds = new Set<string>()
    const directSiblingIds = new Set(siblings.map(s => s.person.id))

    allRelations.forEach((rel) => {
      if (rel.relation_type === 'parent_child' && myParentIds.includes(rel.person1_id)) {
        // This person has the same parent as me
        const potentialSiblingId = rel.person2_id
        if (potentialSiblingId !== personId && !directSiblingIds.has(potentialSiblingId)) {
          siblingIds.add(potentialSiblingId)
        }
      }
    })

    // Add computed siblings
    siblingIds.forEach(siblingId => {
      const siblingPerson = allPersons.find(p => p.id === siblingId)
      if (siblingPerson) {
        // Create a "virtual" relation for display purposes
        siblings.push({
          relation: {
            id: `computed-sibling-${siblingId}`,
            person1_id: personId,
            person2_id: siblingId,
            relation_type: 'sibling',
            marriage_date: null,
            divorce_date: null,
            is_current: true,
            person1: allPersons.find(p => p.id === personId) || { id: personId, first_name: '', last_name: null, middle_name: null },
            person2: siblingPerson,
          },
          person: siblingPerson,
        })
      }
    })
  }

  const formatName = (person: Person) => {
    return [person.last_name, person.first_name, person.middle_name]
      .filter(Boolean)
      .join(' ')
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ru-RU')
  }

  return (
    <div className="pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Родственные связи
        </h3>
        {canEdit && (
          <AddRelationModal
            personId={personId}
            treeId={treeId}
            allPersons={allPersons}
            existingRelations={relations}
            onSuccess={() => router.refresh()}
          />
        )}
      </div>

      {parents.length === 0 && spouses.length === 0 && children.length === 0 && siblings.length === 0 ? (
        <p className="text-gray-500 text-sm">Нет добавленных связей</p>
      ) : (
        <div className="space-y-4">
          {parents.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Родители:</p>
              <div className="space-y-2">
                {parents.map(({ relation, person }) => (
                  <RelationItem
                    key={relation.id}
                    relation={relation}
                    person={person}
                    treeId={treeId}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteRelation(relation.id)}
                    className="bg-gray-50 hover:bg-gray-100"
                  />
                ))}
              </div>
            </div>
          )}

          {spouses.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Супруг(а):
              </p>
              <div className="space-y-2">
                {spouses.map(({ relation, person }) => (
                  <SpouseRelationItem
                    key={relation.id}
                    relation={relation}
                    person={person}
                    treeId={treeId}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteRelation(relation.id)}
                    className="bg-pink-50 hover:bg-pink-100"
                  />
                ))}
              </div>
            </div>
          )}

          {siblings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Братья/Сёстры:</p>
              <div className="space-y-2">
                {siblings.map(({ relation, person }) => (
                  <RelationItem
                    key={relation.id}
                    relation={relation}
                    person={person}
                    treeId={treeId}
                    canEdit={canEdit && !relation.id.startsWith('computed-')}
                    onDelete={() => handleDeleteRelation(relation.id)}
                    className="bg-blue-50 hover:bg-blue-100"
                  />
                ))}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Дети:</p>
              <div className="space-y-2">
                {children.map(({ relation, person }) => (
                  <RelationItem
                    key={relation.id}
                    relation={relation}
                    person={person}
                    treeId={treeId}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteRelation(relation.id)}
                    className="bg-gray-50 hover:bg-gray-100"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RelationItem({
  relation,
  person,
  treeId,
  canEdit,
  onDelete,
  className,
}: {
  relation: Relation
  person: Person
  treeId: string
  canEdit: boolean
  onDelete: () => void
  className?: string
}) {
  const handleDelete = async () => {
    if (!confirm('Удалить эту связь?')) return

    // Optimistic update - remove from UI immediately
    onDelete()

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('relations')
        .delete()
        .eq('id', relation.id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting relation:', error)
      alert('Ошибка при удалении связи')
    }
  }

  const formatName = (p: Person) => {
    return [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ')
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${className}`}>
      <Link
        href={`/tree/${treeId}/person/${person.id}`}
        className="flex-1 hover:underline"
      >
        {formatName(person)}
      </Link>
      {canEdit && (
        <button
          onClick={handleDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Удалить связь"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function SpouseRelationItem({
  relation,
  person,
  treeId,
  canEdit,
  onDelete,
  className,
}: {
  relation: Relation
  person: Person
  treeId: string
  canEdit: boolean
  onDelete: () => void
  className?: string
}) {
  const [editOpen, setEditOpen] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Удалить эту связь?')) return

    // Optimistic update - remove from UI immediately
    onDelete()

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('relations')
        .delete()
        .eq('id', relation.id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting relation:', error)
      alert('Ошибка при удалении связи')
    }
  }

  const formatName = (p: Person) => {
    return [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ')
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ru-RU')
  }

  return (
    <div className={`p-3 rounded-lg transition-colors ${className}`}>
      <div className="flex items-center justify-between">
        <Link
          href={`/tree/${treeId}/person/${person.id}`}
          className="flex-1 hover:underline font-medium"
        >
          {formatName(person)}
        </Link>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Редактировать"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Удалить связь"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {(relation.marriage_date || relation.divorce_date) && (
        <div className="mt-1 text-sm text-gray-500">
          {relation.marriage_date && (
            <span>Брак: {formatDate(relation.marriage_date)}</span>
          )}
          {relation.divorce_date && (
            <span className="ml-2">Развод: {formatDate(relation.divorce_date)}</span>
          )}
        </div>
      )}

      <EditSpouseModal
        open={editOpen}
        onOpenChange={setEditOpen}
        relation={relation}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}

function EditSpouseModal({
  open,
  onOpenChange,
  relation,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  relation: Relation
  onSuccess: () => void
}) {
  const [marriageDate, setMarriageDate] = useState(relation.marriage_date || '')
  const [divorceDate, setDivorceDate] = useState(relation.divorce_date || '')
  const [isCurrent, setIsCurrent] = useState(relation.is_current)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('relations')
        .update({
          marriage_date: marriageDate || null,
          divorce_date: divorceDate || null,
          is_current: isCurrent,
        })
        .eq('id', relation.id)

      if (error) throw error

      // Small delay to ensure DB update is complete before refresh
      await new Promise(resolve => setTimeout(resolve, 100))
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error updating relation:', error)
      alert('Ошибка при обновлении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Редактировать брак</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Дата свадьбы"
            type="date"
            value={marriageDate}
            onChange={(e) => setMarriageDate(e.target.value)}
          />
          <Input
            label="Дата развода"
            type="date"
            value={divorceDate}
            onChange={(e) => setDivorceDate(e.target.value)}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700">Действующий брак</span>
          </label>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

function AddRelationModal({
  personId,
  treeId,
  allPersons,
  existingRelations,
  onSuccess,
}: {
  personId: string
  treeId: string
  allPersons: Person[]
  existingRelations: Relation[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [relationType, setRelationType] = useState<'parent' | 'child' | 'spouse' | 'sibling'>('parent')
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [marriageDate, setMarriageDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filter out current person and already directly related persons
  const directlyRelatedPersonIds = new Set([
    personId,
    ...existingRelations.map((r) =>
      r.person1_id === personId ? r.person2_id : r.person1_id
    ),
  ])

  const availablePersons = allPersons.filter((p) => {
    // Always exclude self
    if (p.id === personId) return false
    // Exclude people already directly related to current person
    if (directlyRelatedPersonIds.has(p.id)) return false
    return true
  })

  const resetForm = () => {
    setRelationType('parent')
    setSelectedPersonId('')
    setMarriageDate('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId) {
      setError('Выберите человека')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      let relationData: any = {
        tree_id: treeId,
      }

      if (relationType === 'parent') {
        // Selected person is parent of current person
        relationData = {
          ...relationData,
          person1_id: selectedPersonId,
          person2_id: personId,
          relation_type: 'parent_child',
        }
      } else if (relationType === 'child') {
        // Current person is parent of selected person
        relationData = {
          ...relationData,
          person1_id: personId,
          person2_id: selectedPersonId,
          relation_type: 'parent_child',
        }
      } else if (relationType === 'spouse') {
        relationData = {
          ...relationData,
          person1_id: personId,
          person2_id: selectedPersonId,
          relation_type: 'spouse',
          marriage_date: marriageDate || null,
          is_current: true,
        }
      } else if (relationType === 'sibling') {
        // Sibling: find parents of current person and make them parents of selected person too
        const parentRelations = existingRelations.filter(
          r => r.relation_type === 'parent_child' && r.person2_id === personId
        )

        if (parentRelations.length > 0) {
          // Add parent relations for selected person
          for (const parentRel of parentRelations) {
            // Check if this relation already exists
            const existingRel = existingRelations.find(
              r => r.relation_type === 'parent_child' &&
                   r.person1_id === parentRel.person1_id &&
                   r.person2_id === selectedPersonId
            )

            if (!existingRel) {
              const { error: relError } = await supabase
                .from('relations')
                .insert({
                  tree_id: treeId,
                  person1_id: parentRel.person1_id,
                  person2_id: selectedPersonId,
                  relation_type: 'parent_child',
                })

              if (relError) console.error('Error adding parent relation:', relError)
            }
          }

          // Skip the default insert below
          await new Promise(resolve => setTimeout(resolve, 100))
          setOpen(false)
          resetForm()
          onSuccess()
          return
        } else {
          // No parents found, create sibling relation directly
          relationData = {
            ...relationData,
            person1_id: personId,
            person2_id: selectedPersonId,
            relation_type: 'sibling',
          }
        }
      }

      const { error } = await supabase.from('relations').insert(relationData)

      if (error) throw error

      // Auto-create implied relations
      if (relationType === 'spouse') {
        await handleSpouseRelationCreated(supabase, treeId, personId, selectedPersonId)
      } else if (relationType === 'parent') {
        // selectedPersonId is parent, personId is child
        await handleParentChildCreated(supabase, treeId, selectedPersonId, personId)
      } else if (relationType === 'child') {
        // personId is parent, selectedPersonId is child
        await handleParentChildCreated(supabase, treeId, personId, selectedPersonId)
      }

      // Small delay to ensure DB update is complete before refresh
      await new Promise(resolve => setTimeout(resolve, 100))
      setOpen(false)
      resetForm()
      onSuccess()
    } catch (error: any) {
      console.error('Error adding relation:', error)
      setError(error.message || 'Ошибка при добавлении связи')
    } finally {
      setLoading(false)
    }
  }

  const formatName = (p: Person) => {
    return [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ')
  }

  return (
    <Modal open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <ModalTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          Добавить связь
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Добавить родственную связь</ModalTitle>
          <ModalDescription>
            Выберите тип связи и человека из дерева
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип связи
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRelationType('parent')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  relationType === 'parent'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Родитель
              </button>
              <button
                type="button"
                onClick={() => setRelationType('child')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  relationType === 'child'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ребёнок
              </button>
              <button
                type="button"
                onClick={() => setRelationType('sibling')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  relationType === 'sibling'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Брат/Сестра
              </button>
              <button
                type="button"
                onClick={() => setRelationType('spouse')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  relationType === 'spouse'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Супруг(а)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите человека
            </label>
            {availablePersons.length === 0 ? (
              <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                Нет доступных людей для добавления связи. Сначала добавьте человека в дерево.
              </p>
            ) : (
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Выберите...</option>
                {availablePersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatName(p)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {relationType === 'spouse' && (
            <Input
              label="Дата свадьбы (необязательно)"
              type="date"
              value={marriageDate}
              onChange={(e) => setMarriageDate(e.target.value)}
            />
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm(); }}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedPersonId || availablePersons.length === 0}
            >
              {loading ? 'Добавление...' : 'Добавить'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
