'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Settings, Users, Trash2, AlertTriangle, Crown, Shield, Edit, Eye, UserMinus, UserPlus } from 'lucide-react'
import { InvitePersonModal } from '@/components/tree/InvitePersonModal'

interface TreeSettingsPageProps {
  params: Promise<{
    treeId: string
  }>
}

interface Tree {
  id: string
  name: string
  description: string | null
  owner_id: string
  share_code: string | null
}

interface TreeMember {
  id: string
  user_id: string
  role: string
  linked_person_id: string | null
  linked_person?: {
    first_name: string
    last_name: string | null
    middle_name: string | null
  } | null
  email?: string
}

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
}

export default function TreeSettingsPage({ params }: TreeSettingsPageProps) {
  const router = useRouter()
  const [treeId, setTreeId] = useState<string>('')
  const [tree, setTree] = useState<Tree | null>(null)
  const [members, setMembers] = useState<TreeMember[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { treeId: id } = await params
      setTreeId(id)
      await loadData(id)
    }
    init()
  }, [params])

  const loadData = async (id: string) => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setCurrentUserId(user.id)
      setCurrentUserEmail(user.email || '')

      // Get tree
      const { data: treeData, error: treeError } = await supabase
        .from('trees')
        .select('*')
        .eq('id', id)
        .single()

      if (treeError || !treeData) {
        router.push('/tree')
        return
      }
      setTree(treeData)

      // Get current user's membership first
      const { data: membership } = await supabase
        .from('tree_members')
        .select('*')
        .eq('tree_id', id)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        router.push('/tree')
        return
      }
      setUserRole(membership.role)

      // Get all members
      const { data: membersData } = await supabase
        .from('tree_members')
        .select('id, user_id, role, linked_person_id')
        .eq('tree_id', id)
        .order('role', { ascending: true })

      // Get linked persons separately
      const linkedPersonIds = (membersData || [])
        .map(m => m.linked_person_id)
        .filter(Boolean)

      let linkedPersonsMap = new Map()
      if (linkedPersonIds.length > 0) {
        const { data: linkedPersonsData } = await supabase
          .from('persons')
          .select('id, first_name, last_name, middle_name')
          .in('id', linkedPersonIds)

        linkedPersonsMap = new Map((linkedPersonsData || []).map(p => [p.id, p]))
      }

      // Get profiles for all member user_ids
      const userIds = (membersData || []).map(m => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]))

      setMembers((membersData || []).map(m => {
        const linkedPerson = m.linked_person_id ? linkedPersonsMap.get(m.linked_person_id) : null
        const profile = profilesMap.get(m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          linked_person_id: m.linked_person_id,
          linked_person: linkedPerson || null,
          email: profile?.email || (m.user_id === user.id ? user.email : undefined)
        }
      }) as TreeMember[])

      // Get all persons for invite modal
      const { data: personsData } = await supabase
        .from('persons')
        .select('id, first_name, last_name, middle_name')
        .eq('tree_id', id)
        .order('first_name')

      setPersons(personsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!tree) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <Link
              href={`/tree/${treeId}`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              ← Вернуться к дереву
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Настройки дерева
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Tree Info */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Информация о дереве
          </h2>
          <TreeInfoEditor
            tree={tree}
            canEdit={isAdmin}
            onUpdate={() => loadData(treeId)}
          />
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Участники ({members.length})
            </h2>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Пригласить
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                treeId={treeId}
                isOwner={isOwner}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                currentUserEmail={currentUserEmail}
                treeOwnerId={tree.owner_id}
                persons={persons}
                onUpdate={() => loadData(treeId)}
              />
            ))}
          </div>
        </div>

        {/* Invite Modal */}
        <InvitePersonModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          treeId={treeId}
          persons={persons}
          linkedPersonIds={members.map(m => m.linked_person_id).filter((id): id is string => id !== null)}
        />

        {/* Danger Zone */}
        {isOwner && (
          <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200">
            <h2 className="text-xl font-semibold text-red-600 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Опасная зона
            </h2>
            <DeleteTreeModal
              tree={tree}
              onDelete={() => router.push('/tree')}
            />
          </div>
        )}
      </main>
    </div>
  )
}

function TreeInfoEditor({
  tree,
  canEdit,
  onUpdate,
}: {
  tree: Tree
  canEdit: boolean
  onUpdate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tree.name)
  const [description, setDescription] = useState(tree.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Название не может быть пустым')
      return
    }

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('trees')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', tree.id)

      if (error) throw error

      setEditing(false)
      onUpdate()
    } catch (error: any) {
      setError(error.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Название</p>
          <p className="text-gray-900 font-medium">{tree.name}</p>
        </div>
        {tree.description && (
          <div>
            <p className="text-sm text-gray-500">Описание</p>
            <p className="text-gray-900">{tree.description}</p>
          </div>
        )}
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Редактировать
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Краткое описание дерева..."
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(false)
            setName(tree.name)
            setDescription(tree.description || '')
            setError('')
          }}
          disabled={saving}
        >
          Отмена
        </Button>
      </div>
    </div>
  )
}

function MemberItem({
  member,
  treeId,
  isOwner,
  isAdmin,
  currentUserId,
  currentUserEmail,
  treeOwnerId,
  persons,
  onUpdate,
}: {
  member: TreeMember
  treeId: string
  isOwner: boolean
  isAdmin: boolean
  currentUserId: string
  currentUserEmail: string
  treeOwnerId: string
  persons: Person[]
  onUpdate: () => void
}) {
  const [changingRole, setChangingRole] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [linkingPerson, setLinkingPerson] = useState(false)
  const [showLinkSelect, setShowLinkSelect] = useState(false)

  const isCurrentUser = member.user_id === currentUserId
  const isMemberOwner = member.user_id === treeOwnerId

  // Get display name from linked person or email
  const getDisplayName = () => {
    if (member.linked_person) {
      return [member.linked_person.last_name, member.linked_person.first_name, member.linked_person.middle_name]
        .filter(Boolean)
        .join(' ')
    }
    if (isCurrentUser) return currentUserEmail
    return 'Участник'
  }

  const displayName = getDisplayName()
  const displayEmail = isCurrentUser ? currentUserEmail : (member.email || '')

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      case 'editor':
        return <Edit className="w-4 h-4 text-green-500" />
      default:
        return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Владелец'
      case 'admin':
        return 'Админ'
      case 'editor':
        return 'Редактор'
      default:
        return 'Наблюдатель'
    }
  }

  const handleChangeRole = async (newRole: string) => {
    setChangingRole(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tree_members')
        .update({ role: newRole })
        .eq('id', member.id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error changing role:', error)
      alert('Ошибка изменения роли')
    } finally {
      setChangingRole(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Удалить этого участника из дерева?')) return

    setRemoving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tree_members')
        .delete()
        .eq('id', member.id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Ошибка удаления участника')
    } finally {
      setRemoving(false)
    }
  }

  const handleLinkPerson = async (personId: string) => {
    setLinkingPerson(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tree_members')
        .update({ linked_person_id: personId || null })
        .eq('id', member.id)

      if (error) throw error
      setShowLinkSelect(false)
      onUpdate()
    } catch (error) {
      console.error('Error linking person:', error)
      alert('Ошибка привязки')
    } finally {
      setLinkingPerson(false)
    }
  }

  const getPersonFullName = (person: Person) => {
    return [person.last_name, person.first_name, person.middle_name]
      .filter(Boolean)
      .join(' ')
  }

  const canManage = isOwner || (isAdmin && !isMemberOwner && member.role !== 'admin')
  const canRemove = canManage && !isMemberOwner && !isCurrentUser
  const canLinkSelf = isCurrentUser && !member.linked_person_id

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
          {displayName[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {displayName}
            {isCurrentUser && <span className="text-sm text-gray-500 ml-2">(вы)</span>}
          </p>
          {displayEmail && (
            <p className="text-sm text-gray-500">{displayEmail}</p>
          )}
          {member.linked_person && (
            <p className="text-xs text-green-600">✓ Привязан к дереву</p>
          )}
          {canLinkSelf && !showLinkSelect && (
            <button
              onClick={() => setShowLinkSelect(true)}
              className="text-xs text-primary-600 hover:text-primary-700 mt-1"
            >
              + Привязать себя к персоне
            </button>
          )}
          {showLinkSelect && (
            <div className="mt-2 flex items-center gap-2">
              <select
                onChange={(e) => e.target.value && handleLinkPerson(e.target.value)}
                disabled={linkingPerson}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                defaultValue=""
              >
                <option value="">Выберите себя...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPersonFullName(p)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowLinkSelect(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border">
          {getRoleIcon(member.role)}
          <span className="text-sm text-gray-700">{getRoleName(member.role)}</span>
        </div>

        {canManage && !isMemberOwner && (
          <select
            value={member.role}
            onChange={(e) => handleChangeRole(e.target.value)}
            disabled={changingRole}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="viewer">Наблюдатель</option>
            <option value="editor">Редактор</option>
            {isOwner && <option value="admin">Админ</option>}
          </select>
        )}

        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить из дерева"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function DeleteTreeModal({
  tree,
  onDelete,
}: {
  tree: Tree
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmName !== tree.name) {
      setError('Название не совпадает')
      return
    }

    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()

      // Delete tree (cascade will delete persons, relations, etc.)
      const { error } = await supabase
        .from('trees')
        .delete()
        .eq('id', tree.id)

      if (error) throw error

      onDelete()
    } catch (error: any) {
      setError(error.message || 'Ошибка удаления дерева')
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="destructive" className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Удалить дерево
        </Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Удаление дерева
          </ModalTitle>
          <ModalDescription>
            Это действие необратимо. Все данные дерева будут удалены навсегда.
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
              <li>Все люди в дереве</li>
              <li>Все связи между людьми</li>
              <li>Все фотографии</li>
              <li>Все участники потеряют доступ</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Для подтверждения введите название дерева: <strong>{tree.name}</strong>
          </p>
          <Input
            placeholder="Введите название дерева"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            disabled={deleting}
          />
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOpen(false); setConfirmName(''); setError(''); }}
            disabled={deleting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmName !== tree.name}
          >
            {deleting ? 'Удаление...' : 'Удалить навсегда'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
