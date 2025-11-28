'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { TreePine, Users, Eye, LogIn, UserPlus } from 'lucide-react'

interface TreeInfo {
  id: string
  name: string
  description: string | null
  personsCount: number
}

interface ReferrerInfo {
  id: string
  full_name: string | null
  email: string
}

export default function FriendInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const treeId = searchParams.get('tree')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tree, setTree] = useState<TreeInfo | null>(null)
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!refCode || !treeId) {
        setError('Неверная ссылка приглашения')
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()

        // Check current user
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        // Get referrer info
        const { data: referrerData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('referral_code', refCode)
          .single()

        if (!referrerData) {
          setError('Приглашение недействительно')
          setLoading(false)
          return
        }
        setReferrer(referrerData)

        // Get tree info
        const { data: treeData, error: treeError } = await supabase
          .from('trees')
          .select('id, name, description')
          .eq('id', treeId)
          .single()

        if (treeError || !treeData) {
          setError('Дерево не найдено')
          setLoading(false)
          return
        }

        // Count persons in tree
        const { count } = await supabase
          .from('persons')
          .select('*', { count: 'exact', head: true })
          .eq('tree_id', treeId)

        setTree({
          ...treeData,
          personsCount: count || 0
        })

        // Check if user is already a member
        if (user) {
          const { data: membership } = await supabase
            .from('tree_members')
            .select('id')
            .eq('tree_id', treeId)
            .eq('user_id', user.id)
            .single()

          if (membership) {
            setAlreadyMember(true)
          }
        }

      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [refCode, treeId])

  const handleJoin = async () => {
    if (!currentUser || !tree || !referrer) return

    setJoining(true)
    try {
      const supabase = createClient()

      // Add as viewer with referrer tracking
      const { error: joinError } = await supabase
        .from('tree_members')
        .insert({
          tree_id: tree.id,
          user_id: currentUser.id,
          role: 'viewer',
          invited_by: referrer.id
        })

      if (joinError) {
        if (joinError.code === '23505') {
          // Already a member
          router.push(`/tree/${tree.id}`)
          return
        }
        throw joinError
      }

      // Update referrer stats
      await supabase
        .from('referral_stats')
        .upsert({
          user_id: referrer.id,
          friends_invited: 1,
          total_referrals: 1
        }, {
          onConflict: 'user_id'
        })

      router.push(`/tree/${tree.id}`)
    } catch (err: any) {
      setError(err.message || 'Ошибка присоединения')
      setJoining(false)
    }
  }

  const handleRegisterAndJoin = () => {
    // Redirect to register with referral info
    const params = new URLSearchParams({
      ref: refCode || '',
      tree: treeId || '',
      type: 'friend'
    })
    router.push(`/auth/register?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TreePine className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button>На главную</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TreePine className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Приглашение в дерево</h1>
          <p className="text-green-100">
            {referrer?.full_name || referrer?.email} приглашает вас посмотреть семейное дерево
          </p>
        </div>

        {/* Tree info */}
        <div className="p-8">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-2">{tree?.name}</h2>
            {tree?.description && (
              <p className="text-gray-600 text-sm mb-3">{tree.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{tree?.personsCount} человек в дереве</span>
            </div>
          </div>

          {/* What you'll get */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Режим просмотра</span>
            </div>
            <ul className="text-sm text-green-700 space-y-2">
              <li>• Просмотр семейного дерева</li>
              <li>• Просмотр фотографий</li>
              <li>• Без доступа к контактам и личным данным</li>
            </ul>
          </div>

          {/* Action buttons */}
          {alreadyMember ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center">
                Вы уже являетесь участником этого дерева
              </div>
              <Link href={`/tree/${tree?.id}`}>
                <Button className="w-full">Открыть дерево</Button>
              </Link>
            </div>
          ) : currentUser ? (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {joining ? 'Присоединение...' : 'Присоединиться как наблюдатель'}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleRegisterAndJoin}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Зарегистрироваться
              </Button>
              <Link href={`/auth/login?redirect=/invite/friend?ref=${refCode}&tree=${treeId}`}>
                <Button variant="outline" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Уже есть аккаунт? Войти
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
