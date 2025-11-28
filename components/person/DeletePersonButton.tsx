'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal'

interface DeletePersonButtonProps {
  personId: string
  treeId: string
  personName: string
}

export function DeletePersonButton({ personId, treeId, personName }: DeletePersonButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Delete relations first
      await supabase
        .from('relations')
        .delete()
        .or(`person1_id.eq.${personId},person2_id.eq.${personId}`)

      // Delete contacts
      await supabase
        .from('person_contacts')
        .delete()
        .eq('person_id', personId)

      // Delete custom sections
      await supabase
        .from('custom_sections')
        .delete()
        .eq('person_id', personId)

      // Delete photos
      await supabase
        .from('photos')
        .delete()
        .eq('person_id', personId)

      // Delete the person
      const { error: deleteError } = await supabase
        .from('persons')
        .delete()
        .eq('id', personId)

      if (deleteError) throw deleteError

      router.push(`/tree/${treeId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-10 h-10 bg-white hover:bg-red-50 text-red-500 hover:text-red-600 rounded-full flex items-center justify-center shadow-md transition-all hover:shadow-lg"
        title="Удалить"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <Modal open={showModal} onOpenChange={setShowModal}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Удалить персонажа?</ModalTitle>
            <ModalDescription>
              Вы уверены, что хотите удалить <strong>{personName}</strong>?
              Это действие нельзя отменить. Все связи, фотографии и данные будут удалены.
            </ModalDescription>
          </ModalHeader>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mx-6">
              {error}
            </div>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
