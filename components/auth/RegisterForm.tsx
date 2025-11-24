'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.session) {
        router.push('/tree')
        router.refresh()
      } else {
        // Email confirmation required
        setError('Проверьте вашу почту для подтверждения аккаунта')
      }
    } catch (error: any) {
      setError(error.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className={`p-3 text-sm border rounded-lg ${
          error.includes('Проверьте')
            ? 'text-green-600 bg-green-50 border-green-200'
            : 'text-red-600 bg-red-50 border-red-200'
        }`}>
          {error}
        </div>
      )}

      <Input
        label="Полное имя"
        type="text"
        placeholder="Иван Иванов"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        disabled={loading}
      />

      <Input
        label="Email"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />

      <Input
        label="Пароль"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={loading}
        minLength={6}
      />

      <Input
        label="Подтвердите пароль"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={loading}
        minLength={6}
      />

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </form>
  )
}
