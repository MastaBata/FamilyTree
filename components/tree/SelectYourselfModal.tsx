'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal'
import { User } from 'lucide-react'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
  avatar_url: string | null
}

interface SelectYourselfModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeId: string
  persons: Person[]
  onSelected: () => void
}

export function SelectYourselfModal({
  open,
  onOpenChange,
  treeId,
  persons,
  onSelected,
}: SelectYourselfModalProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatName = (person: Person) => {
    return [person.last_name, person.first_name, person.middle_name]
      .filter(Boolean)
      .join(' ')
  }

  const handleSubmit = async () => {
    if (!selectedPersonId) {
      setError('Выберите себя из списка')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Не авторизован')

      const { error: updateError } = await supabase
        .from('tree_members')
        .update({ linked_person_id: selectedPersonId })
        .eq('tree_id', treeId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      onSelected()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <ModalTitle>Кто вы в этом дереве?</ModalTitle>
              <ModalDescription>
                Выберите себя, чтобы видеть степень родства с другими людьми
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {persons.map((person) => (
              <button
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                  selectedPersonId === person.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt={formatName(person)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                    {person.first_name[0]}
                  </div>
                )}
                <span className="font-medium text-gray-900">
                  {formatName(person)}
                </span>
                {selectedPersonId === person.id && (
                  <span className="ml-auto text-primary-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Позже
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedPersonId}
          >
            {loading ? 'Сохранение...' : 'Подтвердить'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
