'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface CreateTreeModalProps {
  userId: string
}

export function CreateTreeModal({ userId }: CreateTreeModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Create tree
      const { data: tree, error: treeError } = await supabase
        .from('trees')
        .insert({
          name,
          description: description || null,
          owner_id: userId,
          share_code: Math.random().toString(36).substring(2, 15),
        })
        .select()
        .single()

      if (treeError) throw treeError

      // Add owner as tree member
      const { error: memberError } = await supabase
        .from('tree_members')
        .insert({
          tree_id: tree.id,
          user_id: userId,
          role: 'owner',
        })

      if (memberError) throw memberError

      setOpen(false)
      setName('')
      setDescription('')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Ошибка создания дерева')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>Создать дерево</Button>
      </ModalTrigger>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Создать новое дерево</ModalTitle>
            <ModalDescription>
              Введите название и описание вашего семейного дерева
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 my-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <Input
              label="Название дерева"
              placeholder="Семья Ивановых"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание (необязательно)
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Краткое описание вашего семейного дерева..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
