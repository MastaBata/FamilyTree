'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, Image as ImageIcon, X } from 'lucide-react'
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

interface Photo {
  id: string
  person_id: string
  url: string
  thumbnail_url: string | null
  original_filename: string | null
  title: string | null
  description: string | null
  taken_at: string | null
  is_primary: boolean
  sort_order: number
  created_at: string
}

interface PhotoGalleryProps {
  personId: string
  canEdit: boolean
  initialPhotos?: Photo[]
}

export function PhotoGallery({ personId, canEdit, initialPhotos = [] }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [takenAt, setTakenAt] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setError('')
    setUploading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uploadPromises = files.map(async (file) => {
        // Validate
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} не является изображением`)
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} слишком большой (макс. 10 МБ)`)
        }

        // Upload
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${personId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from('photos').getPublicUrl(fileName)

        // Create photo record
        const { data: newPhoto, error: insertError } = await supabase
          .from('photos')
          .insert({
            person_id: personId,
            uploaded_by: user.id,
            url: publicUrl,
            original_filename: file.name,
            file_size_bytes: file.size,
            title: title || null,
            description: description || null,
            taken_at: takenAt || null,
            sort_order: photos.length,
          })
          .select()
          .single()

        if (insertError) throw insertError

        return newPhoto
      })

      const newPhotos = await Promise.all(uploadPromises)
      setPhotos([...photos, ...newPhotos])
      setIsUploadModalOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Ошибка загрузки фотографий')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Удалить эту фотографию?')) return

    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (deleteError) throw deleteError

      setPhotos(photos.filter((p) => p.id !== photoId))
    } catch (err: any) {
      console.error('Delete error:', err)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTakenAt('')
    setError('')
  }

  if (photos.length === 0 && !canEdit) {
    return null
  }

  return (
    <div className="pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Фотографии
        </h3>
        {canEdit && (
          <Modal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <ModalTrigger asChild>
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Загрузить фото
              </Button>
            </ModalTrigger>
            <ModalContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  document.getElementById('photo-file-input')?.click()
                }}
              >
                <ModalHeader>
                  <ModalTitle>Загрузить фотографии</ModalTitle>
                  <ModalDescription>
                    Выберите одну или несколько фотографий
                  </ModalDescription>
                </ModalHeader>

                <div className="space-y-4 my-4">
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Название (необязательно)"
                    placeholder="Например: Свадьба, Детство"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Описание (необязательно)
                    </label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Описание фотографии..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={uploading}
                    />
                  </div>

                  <Input
                    label="Дата съёмки (необязательно)"
                    type="date"
                    value={takenAt}
                    onChange={(e) => setTakenAt(e.target.value)}
                    disabled={uploading}
                  />

                  <input
                    id="photo-file-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>

                <ModalFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsUploadModalOpen(false)
                      resetForm()
                    }}
                    disabled={uploading}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Загрузка...' : 'Выбрать файлы'}
                  </Button>
                </ModalFooter>
              </form>
            </ModalContent>
          </Modal>
        )}
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.title || 'Фото'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(photo.id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {photo.title && (
                <p className="mt-2 text-sm text-gray-700 font-medium truncate">
                  {photo.title}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Фотографии не добавлены</p>
      )}

      {/* Full-size photo modal */}
      {selectedPhoto && (
        <Modal open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <ModalContent className="max-w-4xl">
            <ModalHeader>
              <ModalTitle>{selectedPhoto.title || 'Фотография'}</ModalTitle>
              {selectedPhoto.taken_at && (
                <ModalDescription>
                  {new Date(selectedPhoto.taken_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </ModalDescription>
              )}
            </ModalHeader>

            <div className="my-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title || 'Фото'}
                className="w-full rounded-lg"
              />
              {selectedPhoto.description && (
                <p className="mt-4 text-gray-700">{selectedPhoto.description}</p>
              )}
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
                Закрыть
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}
