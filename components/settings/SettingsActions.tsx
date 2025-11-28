'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Eye, EyeOff, Pencil, Key, Trash2, AlertTriangle } from 'lucide-react'

interface SettingsActionsProps {
  currentName: string | null
  userEmail: string
}

export function SettingsActions({ currentName, userEmail }: SettingsActionsProps) {
  return (
    <div className="space-y-3">
      <EditNameModal currentName={currentName} />
      <ChangePasswordModal />
      <DeleteAccountModal userEmail={userEmail} />
    </div>
  )
}

function EditNameModal({ currentName }: { currentName: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(currentName || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Не авторизован')

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim() })
        .eq('id', user.id)

      if (error) throw error

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Ошибка при обновлении имени')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button className="w-full px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors text-left flex items-center gap-3">
          <Pencil className="w-5 h-5" />
          <span>Изменить имя</span>
        </button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Изменить имя</ModalTitle>
          <ModalDescription>
            Введите ваше имя, которое будет отображаться в профиле
          </ModalDescription>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">
              {error}
            </div>
          )}
          <Input
            label="Имя"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
          <ModalFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

function ChangePasswordModal() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают')
      return
    }

    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // First verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Не удалось получить email пользователя')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Неверный текущий пароль')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Ошибка при смене пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <ModalTrigger asChild>
        <button className="w-full px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors text-left flex items-center gap-3">
          <Key className="w-5 h-5" />
          <span>Изменить пароль</span>
        </button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Изменить пароль</ModalTitle>
          <ModalDescription>
            Введите текущий пароль и новый пароль
          </ModalDescription>
        </ModalHeader>
        {success ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-gray-900 font-medium">Пароль успешно изменён!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg mb-4">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Текущий пароль"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Новый пароль"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Input
                label="Подтвердите новый пароль"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Пароль должен содержать минимум 6 символов
            </p>

            <ModalFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); resetForm(); }}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : 'Изменить пароль'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

function DeleteAccountModal({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmEmail !== userEmail) {
      setError('Email не совпадает')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Не авторизован')

      // Delete user's data
      // 1. Delete all trees owned by user (cascade will delete persons, relations, etc.)
      await supabase
        .from('trees')
        .delete()
        .eq('owner_id', user.id)

      // 2. Remove user from all trees they're members of
      await supabase
        .from('tree_members')
        .delete()
        .eq('user_id', user.id)

      // 3. Delete notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      // 4. Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      // 5. Sign out and delete auth user (requires admin API, so we just sign out)
      await supabase.auth.signOut()

      router.push('/')
    } catch (error: any) {
      setError(error.message || 'Ошибка при удалении аккаунта')
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors text-left flex items-center gap-3">
          <Trash2 className="w-5 h-5" />
          <span>Удалить аккаунт</span>
        </button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Удаление аккаунта
          </ModalTitle>
          <ModalDescription>
            Это действие необратимо. Все ваши деревья, данные о людях и фотографии будут удалены навсегда.
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
              <li>Все ваши семейные деревья</li>
              <li>Все добавленные вами люди</li>
              <li>Все загруженные фотографии</li>
              <li>Вся история изменений</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Для подтверждения введите ваш email: <strong>{userEmail}</strong>
          </p>
          <Input
            placeholder="Введите email для подтверждения"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOpen(false); setConfirmEmail(''); setError(''); }}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmEmail !== userEmail}
          >
            {loading ? 'Удаление...' : 'Удалить аккаунт'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
