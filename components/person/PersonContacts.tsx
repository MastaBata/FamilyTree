'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, Mail, MapPin, MessageCircle, Trash2, Plus, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/Modal'

interface Contact {
  id: string
  person_id: string
  type: string
  value: string
  label: string | null
  privacy: string
  sort_order: number
}

interface PersonContactsProps {
  personId: string
  treeId: string
  canEdit: boolean
  initialContacts?: Contact[]
}

const CONTACT_TYPES = [
  { value: 'phone', label: 'Телефон', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'address', label: 'Адрес', icon: MapPin },
  { value: 'telegram', label: 'Telegram', icon: MessageCircle },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'viber', label: 'Viber', icon: MessageCircle },
]

const PRIVACY_LEVELS = [
  { value: 'public', label: 'Публично' },
  { value: 'tree_members', label: 'Члены дерева' },
  { value: 'close_relatives', label: 'Близкие родственники' },
  { value: 'private', label: 'Приватно' },
]

export function PersonContacts({ personId, treeId, canEdit, initialContacts = [] }: PersonContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [contactType, setContactType] = useState('phone')
  const [contactValue, setContactValue] = useState('')
  const [contactLabel, setContactLabel] = useState('')
  const [contactPrivacy, setContactPrivacy] = useState('tree_members')

  const getContactIcon = (type: string) => {
    const contactType = CONTACT_TYPES.find(ct => ct.value === type)
    const Icon = contactType?.icon || Phone
    return <Icon className="w-4 h-4" />
  }

  const getContactTypeLabel = (type: string) => {
    return CONTACT_TYPES.find(ct => ct.value === type)?.label || type
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: newContact, error: insertError } = await supabase
        .from('person_contacts')
        .insert({
          person_id: personId,
          type: contactType,
          value: contactValue,
          label: contactLabel || null,
          privacy: contactPrivacy,
          sort_order: contacts.length,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setContacts([...contacts, newContact])
      setIsAddModalOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления контакта')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Удалить этот контакт?')) return

    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from('person_contacts')
        .delete()
        .eq('id', contactId)

      if (deleteError) throw deleteError

      setContacts(contacts.filter(c => c.id !== contactId))
    } catch (err: any) {
      console.error('Ошибка удаления контакта:', err)
    }
  }

  const resetForm = () => {
    setContactType('phone')
    setContactValue('')
    setContactLabel('')
    setContactPrivacy('tree_members')
    setError('')
  }

  if (contacts.length === 0 && !canEdit) {
    return null
  }

  return (
    <div className="pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Контакты</h3>
        {canEdit && (
          <Modal open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <ModalTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Добавить контакт
              </Button>
            </ModalTrigger>
            <ModalContent>
              <form onSubmit={handleAddContact}>
                <ModalHeader>
                  <ModalTitle>Добавить контакт</ModalTitle>
                  <ModalDescription>
                    Добавьте контактную информацию и настройте приватность
                  </ModalDescription>
                </ModalHeader>

                <div className="space-y-4 my-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип контакта *
                    </label>
                    <select
                      value={contactType}
                      onChange={(e) => setContactType(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={loading}
                    >
                      {CONTACT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Значение *"
                    placeholder={contactType === 'email' ? 'example@email.com' : contactType === 'phone' ? '+1234567890' : 'Значение'}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    required
                    disabled={loading}
                  />

                  <Input
                    label="Метка"
                    placeholder="Например: Рабочий, Домашний"
                    value={contactLabel}
                    onChange={(e) => setContactLabel(e.target.value)}
                    disabled={loading}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Приватность *
                    </label>
                    <select
                      value={contactPrivacy}
                      onChange={(e) => setContactPrivacy(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={loading}
                    >
                      {PRIVACY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ModalFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false)
                      resetForm()
                    }}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Добавление...' : 'Добавить'}
                  </Button>
                </ModalFooter>
              </form>
            </ModalContent>
          </Modal>
        )}
      </div>

      {contacts.length > 0 ? (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-gray-400">
                  {getContactIcon(contact.type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {contact.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {contact.label || getContactTypeLabel(contact.type)}
                    {' • '}
                    {PRIVACY_LEVELS.find(p => p.value === contact.privacy)?.label}
                  </p>
                </div>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteContact(contact.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Контактная информация не добавлена</p>
      )}
    </div>
  )
}
