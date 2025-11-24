'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FolderOpen, Plus, Edit2, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
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

interface CustomSection {
  id: string
  person_id: string
  title: string
  content: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface CustomSectionsProps {
  personId: string
  canEdit: boolean
  initialSections?: CustomSection[]
}

export function CustomSections({ personId, canEdit, initialSections = [] }: CustomSectionsProps) {
  const [sections, setSections] = useState<CustomSection[]>(initialSections)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionContent, setSectionContent] = useState('')

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: newSection, error: insertError } = await supabase
        .from('custom_sections')
        .insert({
          person_id: personId,
          title: sectionTitle,
          content: sectionContent || null,
          sort_order: sections.length,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setSections([...sections, newSection])
      setIsAddModalOpen(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления раздела')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSection) return

    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: updatedSection, error: updateError } = await supabase
        .from('custom_sections')
        .update({
          title: sectionTitle,
          content: sectionContent || null,
        })
        .eq('id', editingSection.id)
        .select()
        .single()

      if (updateError) throw updateError

      setSections(sections.map(s => s.id === editingSection.id ? updatedSection : s))
      setEditingSection(null)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления раздела')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Удалить этот раздел и все его файлы?')) return

    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from('custom_sections')
        .delete()
        .eq('id', sectionId)

      if (deleteError) throw deleteError

      setSections(sections.filter(s => s.id !== sectionId))
    } catch (err: any) {
      console.error('Ошибка удаления раздела:', err)
    }
  }

  const openEditModal = (section: CustomSection) => {
    setEditingSection(section)
    setSectionTitle(section.title)
    setSectionContent(section.content || '')
  }

  const closeEditModal = () => {
    setEditingSection(null)
    resetForm()
  }

  const resetForm = () => {
    setSectionTitle('')
    setSectionContent('')
    setError('')
  }

  if (sections.length === 0 && !canEdit) {
    return null
  }

  return (
    <div className="pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Дополнительные разделы
        </h3>
        {canEdit && (
          <Modal open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <ModalTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Добавить раздел
              </Button>
            </ModalTrigger>
            <ModalContent>
              <form onSubmit={handleAddSection}>
                <ModalHeader>
                  <ModalTitle>Добавить раздел</ModalTitle>
                  <ModalDescription>
                    Создайте пользовательский раздел для дополнительной информации
                  </ModalDescription>
                </ModalHeader>

                <div className="space-y-4 my-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Название раздела *"
                    placeholder="Например: Награды, Путешествия, Достижения"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    required
                    disabled={loading}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Содержание
                    </label>
                    <textarea
                      className="flex min-h-[150px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Текстовое содержание раздела..."
                      value={sectionContent}
                      onChange={(e) => setSectionContent(e.target.value)}
                      disabled={loading}
                    />
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

      {/* Edit modal */}
      {editingSection && (
        <Modal open={true} onOpenChange={(open) => !open && closeEditModal()}>
          <ModalContent>
            <form onSubmit={handleUpdateSection}>
              <ModalHeader>
                <ModalTitle>Редактировать раздел</ModalTitle>
                <ModalDescription>
                  Измените название или содержание раздела
                </ModalDescription>
              </ModalHeader>

              <div className="space-y-4 my-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <Input
                  label="Название раздела *"
                  placeholder="Например: Награды, Путешествия, Достижения"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  required
                  disabled={loading}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Содержание
                  </label>
                  <textarea
                    className="flex min-h-[150px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Текстовое содержание раздела..."
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <ModalFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
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
      )}

      {sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id)

            return (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 flex-1 text-left hover:text-primary-600 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{section.title}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                  {canEdit && (
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(section)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>

                {isExpanded && section.content && (
                  <div className="p-4 bg-white">
                    <p className="text-gray-700 whitespace-pre-line">{section.content}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Дополнительные разделы не добавлены</p>
      )}
    </div>
  )
}
