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
import { UserPlus, Copy, Check } from 'lucide-react'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
}

interface InvitePersonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeId: string
  persons: Person[]
  linkedPersonIds?: string[]
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function InvitePersonModal({
  open,
  onOpenChange,
  treeId,
  persons,
  linkedPersonIds = [],
}: InvitePersonModalProps) {
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Filter out persons who are already linked to a tree member
  const availablePersons = persons.filter(p => !linkedPersonIds.includes(p.id))
  const selectedPerson = availablePersons.find(p => p.id === selectedPersonId)

  const formatName = (person: Person) => {
    return [person.last_name, person.first_name, person.middle_name]
      .filter(Boolean)
      .join(' ')
  }

  const handleCreateInvite = async () => {
    if (!selectedPersonId) {
      setError('Выберите человека')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // Check if there's an existing valid invitation for this person
      const { data: existingInvite } = await supabase
        .from('invitations')
        .select('invite_code, expires_at')
        .eq('tree_id', treeId)
        .eq('person_id', selectedPersonId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingInvite) {
        // Use existing invitation
        const link = `${window.location.origin}/auth/register?invite=${existingInvite.invite_code}`
        setInviteLink(link)
      } else {
        // Create new invitation
        const inviteCode = generateInviteCode()

        const { error: insertError } = await supabase
          .from('invitations')
          .insert({
            tree_id: treeId,
            person_id: selectedPersonId,
            invite_code: inviteCode,
            created_by: user.id,
          })

        if (insertError) throw insertError

        const link = `${window.location.origin}/auth/register?invite=${inviteCode}`
        setInviteLink(link)
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка создания приглашения')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setSelectedPersonId('')
    setInviteLink('')
    setError('')
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <ModalTitle>Пригласить участника</ModalTitle>
              <ModalDescription>
                Выберите человека из дерева, чтобы пригласить его зарегистрироваться
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

          {!inviteLink ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Кого пригласить?
                </label>
                {availablePersons.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-600 text-sm">
                      Все люди в дереве уже подключены к аккаунтам
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {availablePersons.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setSelectedPersonId(person.id)}
                        disabled={loading}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selectedPersonId === person.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-white flex-shrink-0 ${
                          selectedPersonId === person.id ? 'bg-primary-500' : 'bg-gray-400'
                        }`}>
                          {person.first_name[0]}
                        </div>
                        <span className={`font-medium ${
                          selectedPersonId === person.id ? 'text-primary-700' : 'text-gray-700'
                        }`}>
                          {formatName(person)}
                        </span>
                        {selectedPersonId === person.id && (
                          <span className="ml-auto text-primary-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPerson && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">После регистрации:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>{formatName(selectedPerson)} сможет редактировать свой профиль</li>
                    <li>А также профили родителей, детей, братьев и сестёр</li>
                    <li>Добавлять новых родственников к этим людям</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Ссылка для {selectedPerson && formatName(selectedPerson)}:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-white border border-green-300 rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Ссылка действительна 7 дней. Отправьте её человеку, которого хотите пригласить.
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={handleClose}>
            {inviteLink ? 'Готово' : 'Отмена'}
          </Button>
          {!inviteLink && (
            <Button onClick={handleCreateInvite} disabled={loading || !selectedPersonId}>
              {loading ? 'Создание...' : 'Создать ссылку'}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
