'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, User, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AvatarUploadProps {
  personId: string
  currentAvatarUrl: string | null
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ personId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5 МБ)')
      return
    }

    setError('')
    setUploading(true)

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${personId}_${Date.now()}.${fileExt}`

      // Upload to storage
      const { error: uploadError, data } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(fileName)

      // Update person's avatar_url
      const { error: updateError } = await supabase
        .from('persons')
        .update({ avatar_url: publicUrl })
        .eq('id', personId)

      if (updateError) throw updateError

      setPreviewUrl(publicUrl)
      onUploadComplete(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Ошибка загрузки фото')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Удалить фото?')) return

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()

      // Remove avatar_url from person
      const { error: updateError } = await supabase
        .from('persons')
        .update({ avatar_url: null })
        .eq('id', personId)

      if (updateError) throw updateError

      // Note: We don't delete from storage to keep old URLs working
      // Storage cleanup can be done separately

      setPreviewUrl(null)
      onUploadComplete('')
    } catch (err: any) {
      console.error('Remove error:', err)
      setError(err.message || 'Ошибка удаления фото')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div className="relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          )}

          {previewUrl && !uploading && (
            <button
              onClick={handleRemove}
              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Upload button */}
        <div>
          <label htmlFor="avatar-upload" className="cursor-pointer">
            <div
              className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Загрузка...' : previewUrl ? 'Изменить фото' : 'Загрузить фото'}
            </div>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPG до 5 МБ
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}
