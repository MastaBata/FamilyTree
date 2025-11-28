'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DateInput } from '@/components/ui/DateInput'
import { Heart, Baby, Users, UserPlus } from 'lucide-react'
import { RelationType } from './PersonNode'
import { handleSpouseRelationCreated, handleParentChildCreated } from '@/lib/utils/autoCreateRelations'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name?: string | null
  gender?: string | null
}

interface Relation {
  id: string
  person1_id: string
  person2_id: string
  relation_type: string
}

interface AddRelativeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeId: string
  relatedPerson: Person | null
  relationType: RelationType | null
  persons: Person[]
  relations: Relation[]
}

const relationTitles: Record<RelationType, { title: string; description: string; icon: typeof Heart }> = {
  spouse: { title: 'Добавить супруга', description: 'Муж или жена', icon: Heart },
  child: { title: 'Добавить ребёнка', description: 'Сын или дочь', icon: Baby },
  parent: { title: 'Добавить родителя', description: 'Отец или мать', icon: Users },
  sibling: { title: 'Добавить брата/сестру', description: 'Брат или сестра', icon: UserPlus },
}

export function AddRelativeModal({
  open,
  onOpenChange,
  treeId,
  relatedPerson,
  relationType,
  persons,
  relations,
}: AddRelativeModalProps) {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')

  // Spouse-specific fields
  const [marriageDate, setMarriageDate] = useState('')
  const [isDivorced, setIsDivorced] = useState(false)
  const [divorceDate, setDivorceDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes or relation type changes
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, relationType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!relatedPerson || !relationType) return

    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // Add person
      const { data: newPerson, error: personError } = await supabase
        .from('persons')
        .insert({
          tree_id: treeId,
          first_name: firstName,
          last_name: lastName || null,
          middle_name: middleName || null,
          gender: gender || null,
          birth_date: birthDate || null,
          is_alive: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (personError) throw personError

      // Create relation based on type
      if (relationType === 'spouse') {
        // Spouse relation
        const { error: relationError } = await supabase
          .from('relations')
          .insert({
            tree_id: treeId,
            person1_id: relatedPerson.id,
            person2_id: newPerson.id,
            relation_type: isDivorced ? 'ex_spouse' : 'spouse',
            marriage_date: marriageDate || null,
            divorce_date: isDivorced && divorceDate ? divorceDate : null,
          })

        if (relationError) throw relationError

        // Auto-create parent_child relations for spouse's children
        await handleSpouseRelationCreated(supabase, treeId, relatedPerson.id, newPerson.id)

      } else if (relationType === 'child') {
        // Child: relatedPerson is parent, newPerson is child
        // Create relation with first parent
        const { error: relationError } = await supabase
          .from('relations')
          .insert({
            tree_id: treeId,
            person1_id: relatedPerson.id,
            person2_id: newPerson.id,
            relation_type: 'parent_child',
          })

        if (relationError) throw relationError

        // Also create relation with spouse (second parent) if exists
        const spouseRelation = relations.find(
          r => (r.relation_type === 'spouse' || r.relation_type === 'ex_spouse') &&
               (r.person1_id === relatedPerson.id || r.person2_id === relatedPerson.id)
        )

        if (spouseRelation) {
          const spouseId = spouseRelation.person1_id === relatedPerson.id
            ? spouseRelation.person2_id
            : spouseRelation.person1_id

          await supabase
            .from('relations')
            .insert({
              tree_id: treeId,
              person1_id: spouseId,
              person2_id: newPerson.id,
              relation_type: 'parent_child',
            })
        }

      } else if (relationType === 'parent') {
        // Parent: newPerson is parent, relatedPerson is child
        const { error: relationError } = await supabase
          .from('relations')
          .insert({
            tree_id: treeId,
            person1_id: newPerson.id,
            person2_id: relatedPerson.id,
            relation_type: 'parent_child',
          })

        if (relationError) throw relationError

        // Check if the child already has another parent - if so, auto-create spouse relation
        const existingParentRelations = relations.filter(
          r => r.relation_type === 'parent_child' && r.person2_id === relatedPerson.id
        )

        if (existingParentRelations.length > 0) {
          // There's already a parent, create spouse relation between them
          const otherParentId = existingParentRelations[0].person1_id

          // Check if spouse relation already exists
          const existingSpouseRelation = relations.find(
            r => (r.relation_type === 'spouse' || r.relation_type === 'ex_spouse') &&
                 ((r.person1_id === otherParentId && r.person2_id === newPerson.id) ||
                  (r.person1_id === newPerson.id && r.person2_id === otherParentId))
          )

          if (!existingSpouseRelation) {
            // Create spouse relation between the two parents
            await supabase
              .from('relations')
              .insert({
                tree_id: treeId,
                person1_id: otherParentId,
                person2_id: newPerson.id,
                relation_type: 'spouse',
              })
          }
        }

      } else if (relationType === 'sibling') {
        // Sibling: find parents of relatedPerson and make them parents of newPerson too
        const parentRelations = relations.filter(
          r => r.relation_type === 'parent_child' && r.person2_id === relatedPerson.id
        )

        if (parentRelations.length > 0) {
          // Add parent relations for new person
          for (const parentRel of parentRelations) {
            const { error: relationError } = await supabase
              .from('relations')
              .insert({
                tree_id: treeId,
                person1_id: parentRel.person1_id,
                person2_id: newPerson.id,
                relation_type: 'parent_child',
              })

            if (relationError) console.error('Error adding parent relation:', relationError)
          }
        } else {
          // No parents found, create sibling relation directly
          const { error: relationError } = await supabase
            .from('relations')
            .insert({
              tree_id: treeId,
              person1_id: relatedPerson.id,
              person2_id: newPerson.id,
              relation_type: 'sibling',
            })

          if (relationError) throw relationError
        }
      }

      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Ошибка добавления')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setMiddleName('')
    setGender('')
    setBirthDate('')
    setMarriageDate('')
    setIsDivorced(false)
    setDivorceDate('')
    setError('')
  }

  if (!relationType) return null

  const { title, description, icon: Icon } = relationTitles[relationType]
  const relatedPersonName = relatedPerson
    ? `${relatedPerson.first_name} ${relatedPerson.last_name || ''}`.trim()
    : ''

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <ModalTitle>{title}</ModalTitle>
                <ModalDescription>
                  {description} для {relatedPersonName}
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <div className="space-y-4 my-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic fields for all relation types */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Имя *"
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Фамилия"
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>

            <Input
              label="Отчество"
              placeholder="Отчество"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пол
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>

            <DateInput
              label="Дата рождения"
              value={birthDate}
              onChange={setBirthDate}
              disabled={loading}
            />

            {/* Spouse-specific fields */}
            {relationType === 'spouse' && (
              <>
                <DateInput
                  label="Дата свадьбы"
                  value={marriageDate}
                  onChange={setMarriageDate}
                  disabled={loading}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDivorced"
                    checked={isDivorced}
                    onChange={(e) => setIsDivorced(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    disabled={loading}
                  />
                  <label htmlFor="isDivorced" className="text-sm font-medium text-gray-700">
                    В разводе
                  </label>
                </div>

                {isDivorced && (
                  <DateInput
                    label="Дата развода"
                    value={divorceDate}
                    onChange={setDivorceDate}
                    disabled={loading}
                  />
                )}
              </>
            )}
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !firstName}>
              {loading ? 'Добавление...' : 'Добавить'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
