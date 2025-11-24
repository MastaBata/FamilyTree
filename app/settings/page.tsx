import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { User, Mail, Calendar, HardDrive } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's trees count
  const { count: treesCount } = await supabase
    .from('tree_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return gb.toFixed(2) + ' ГБ'
  }

  const storagePercent = profile
    ? (profile.storage_used_bytes / profile.storage_limit_bytes) * 100
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/tree"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                ← Все деревья
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Настройки аккаунта</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile info */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5" />
              Информация о профиле
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{profile?.email || user.email}</p>
                </div>
              </div>

              {profile?.full_name && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Имя</p>
                    <p className="text-gray-900">{profile.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Дата регистрации</p>
                  <p className="text-gray-900">
                    {profile?.created_at ? formatDate(profile.created_at) : 'Неизвестно'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage stats */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Использование
            </h2>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Деревья
                  </p>
                  <p className="text-sm text-gray-600">{treesCount || 0}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Использовано места
                  </p>
                  <p className="text-sm text-gray-600">
                    {profile ? formatStorage(profile.storage_used_bytes) : '0 ГБ'} /{' '}
                    {profile ? formatStorage(profile.storage_limit_bytes) : '2 ГБ'}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(storagePercent, 100)}%` }}
                  />
                </div>
                {storagePercent > 80 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Заканчивается место для хранения
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Подписка
                  </p>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {profile?.subscription_status === 'free' ? 'Бесплатная' : profile?.subscription_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Действия
            </h2>

            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors text-left flex items-center justify-between">
                <span>Изменить имя</span>
                <span className="text-sm text-gray-500">(скоро)</span>
              </button>

              <button className="w-full px-4 py-3 bg-primary-50 text-primary-700 rounded-lg font-medium hover:bg-primary-100 transition-colors text-left flex items-center justify-between">
                <span>Изменить пароль</span>
                <span className="text-sm text-gray-500">(скоро)</span>
              </button>

              <button className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors text-left flex items-center justify-between">
                <span>Удалить аккаунт</span>
                <span className="text-sm text-gray-500">(скоро)</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
