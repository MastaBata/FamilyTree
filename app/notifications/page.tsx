'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { UserMenu } from '@/components/auth/UserMenu'
import { Bell, Check, Trash2, CheckCheck, Users, Calendar, Star, AlertCircle, Gift, UserPlus, TreeDeciduous } from 'lucide-react'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: any
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [userEmail, setUserEmail] = useState<string | undefined>()

  useEffect(() => {
    checkAuth()
    fetchNotifications()

    // Set up realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
    } else {
      setUserEmail(user.email)
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setNotifications(data)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const supabase = createClient()

      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const deleteAllRead = async () => {
    if (!confirm('Удалить все прочитанные уведомления?')) return

    try {
      const supabase = createClient()

      await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true)

      setNotifications((prev) => prev.filter((n) => !n.is_read))
    } catch (err) {
      console.error('Error deleting read notifications:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays < 7) return `${diffDays} дн назад`
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getNotificationLink = (notification: Notification) => {
    if (!notification.data) return null

    if (notification.data.tree_id && notification.data.person_id) {
      return `/tree/${notification.data.tree_id}/person/${notification.data.person_id}`
    }
    if (notification.data.tree_id) {
      return `/tree/${notification.data.tree_id}`
    }
    return null
  }

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'new_relative':
        return {
          icon: <UserPlus className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-green-400 to-green-600',
          lightBg: 'bg-green-50',
        }
      case 'birthday':
        return {
          icon: <Gift className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-pink-400 to-pink-600',
          lightBg: 'bg-pink-50',
        }
      case 'memorial':
        return {
          icon: <Star className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
          lightBg: 'bg-purple-50',
        }
      case 'access_request':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
          lightBg: 'bg-orange-50',
        }
      case 'tree_invite':
        return {
          icon: <TreeDeciduous className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
          lightBg: 'bg-emerald-50',
        }
      default:
        return {
          icon: <Bell className="w-5 h-5" />,
          bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
          lightBg: 'bg-blue-50',
        }
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const readCount = notifications.filter((n) => n.is_read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/tree" className="text-2xl font-bold text-primary-800">
            FamilyTree
          </Link>
          <UserMenu userEmail={userEmail} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
                <p className="text-gray-500 text-sm">
                  {unreadCount > 0 ? `${unreadCount} новых` : 'Нет новых уведомлений'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Прочитать все
                </Button>
              )}
              {readCount > 0 && (
                <Button variant="ghost" size="sm" onClick={deleteAllRead} className="text-gray-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Очистить
                </Button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Все ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Новые ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-500">Загрузка...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'Нет новых уведомлений' : 'Нет уведомлений'}
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Здесь будут появляться уведомления о событиях в ваших семейных деревьях
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const link = getNotificationLink(notification)
              const style = getNotificationStyle(notification.type)

              const Content = (
                <div
                  className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md ${
                    !notification.is_read ? 'ring-2 ring-primary-200 ring-offset-2' : ''
                  }`}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                        </div>
                        {!notification.is_read && (
                          <span className="w-2.5 h-2.5 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary-600 transition-colors"
                          title="Отметить как прочитанное"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )

              return link ? (
                <Link
                  key={notification.id}
                  href={link}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id)
                    }
                  }}
                  className="block"
                >
                  {Content}
                </Link>
              ) : (
                <div key={notification.id}>{Content}</div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
