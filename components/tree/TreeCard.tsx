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
import { Trash2, Settings, AlertTriangle, MoreVertical } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

interface TreeCardProps {
  tree: Tree
  userId: string
}

export function TreeCard({ tree, userId }: TreeCardProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const isOwner = tree.owner_id === userId

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow relative group">
      <Link href={`/tree/${tree.id}`} className="block p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pr-8">
          {tree.name}
        </h3>
        {tree.description && (
          <p className="text-gray-600 text-sm">{tree.description}</p>
        )}
        <div className="mt-4 text-xs text-gray-500">
          Создано: {new Date(tree.created_at).toLocaleDateString('ru-RU')}
        </div>
      </Link>

      {/* Menu button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <Link
                href={`/tree/${tree.id}/settings`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setShowMenu(false)}
              >
                <Settings className="w-4 h-4" />
                Настройки
              </Link>
              {isOwner && (
                <DeleteTreeButton tree={tree} onDelete={() => router.refresh()} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DeleteTreeButton({
  tree,
  onDelete,
}: {
  tree: Tree
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmName !== tree.name) {
      setError('Название не совпадает')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('trees')
        .delete()
        .eq('id', tree.id)

      if (error) throw error

      await new Promise(resolve => setTimeout(resolve, 100))
      setOpen(false)
      onDelete()
    } catch (error: any) {
      setError(error.message || 'Ошибка удаления дерева')
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-4 h-4" />
          Удалить дерево
        </button>
      </ModalTrigger>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Удаление дерева
          </ModalTitle>
          <ModalDescription>
            Это действие необратимо. Все данные дерева будут удалены навсегда.
          </ModalDescription>
        </ModalHeader>

        <div className="py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              <strong>Внимание!</strong> Будут удалены:
            </p>
            <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
              <li>Все люди в дереве</li>
              <li>Все связи между людьми</li>
              <li>Все фотографии</li>
              <li>Все участники потеряют доступ</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Для подтверждения введите название дерева: <strong>{tree.name}</strong>
          </p>
          <Input
            placeholder="Введите название дерева"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            disabled={deleting}
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOpen(false); setConfirmName(''); setError(''); }}
            disabled={deleting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmName !== tree.name}
          >
            {deleting ? 'Удаление...' : 'Удалить навсегда'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
