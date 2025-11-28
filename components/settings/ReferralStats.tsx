'use client'

import { useState } from 'react'
import { Users, UserPlus, Copy, Check, Share2, Gift } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ReferralStatsProps {
  referralCode: string | null
  friendsInvited: number
  familyMembersInvited: number
  totalReferrals: number
}

export function ReferralStats({
  referralCode,
  friendsInvited,
  familyMembersInvited,
  totalReferrals,
}: ReferralStatsProps) {
  const [copied, setCopied] = useState(false)

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?ref=${referralCode}`
    : ''

  const copyReferralLink = async () => {
    if (!referralLink) return

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary-500" />
        Реферальная программа
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <UserPlus className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700">{friendsInvited}</p>
          <p className="text-xs text-green-600">Друзей</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{familyMembersInvited}</p>
          <p className="text-xs text-blue-600">Родственников</p>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Share2 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{totalReferrals}</p>
          <p className="text-xs text-purple-600">Всего</p>
        </div>
      </div>

      {/* Referral Link */}
      {referralCode && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Ваша реферальная ссылка
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Поделитесь этой ссылкой с друзьями. Когда они зарегистрируются, вы получите +1 к статистике.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
        <p className="text-sm text-primary-800">
          <strong>Как это работает:</strong>
        </p>
        <ul className="text-sm text-primary-700 mt-2 space-y-1">
          <li>• <strong>Друзья</strong> - люди, которые зарегистрировались по вашей общей ссылке</li>
          <li>• <strong>Родственники</strong> - люди, которых вы пригласили в конкретное дерево</li>
        </ul>
      </div>
    </div>
  )
}
