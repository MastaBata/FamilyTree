'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Share2, Copy, Check } from 'lucide-react'

interface ShareModalProps {
  treeId: string
  userId: string
  shareCode: string | null
}

export function ShareModal({ treeId, userId, shareCode: initialShareCode }: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const [shareCode, setShareCode] = useState(initialShareCode)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const shareUrl = shareCode
    ? `${window.location.origin}/invite/${shareCode}`
    : ''

  useEffect(() => {
    if (!shareCode && open) {
      generateShareCode()
    }
  }, [open])

  const generateShareCode = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const code = Math.random().toString(36).substring(2, 15)

      const { error } = await supabase
        .from('trees')
        .update({ share_code: code })
        .eq('id', treeId)

      if (error) throw error

      setShareCode(code)
    } catch (error) {
      console.error('Error generating share code:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Поделиться
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Поделиться деревом</ModalTitle>
          <ModalDescription>
            Скопируйте ссылку и отправьте её родственникам
          </ModalDescription>
        </ModalHeader>

        <div className="my-4 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-600">
              Генерация ссылки...
            </div>
          ) : shareUrl ? (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Копировать
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                💡 Любой, у кого есть эта ссылка, сможет просмотреть ваше дерево и добавить информацию
              </div>
            </>
          ) : (
            <Button onClick={generateShareCode} disabled={loading}>
              Создать ссылку-приглашение
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
}
