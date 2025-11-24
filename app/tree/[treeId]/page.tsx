import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AddPersonButton } from '@/components/tree/AddPersonButton'
import { TreeView } from '@/components/tree/TreeView'
import { ShareModal } from '@/components/tree/ShareModal'

interface TreePageProps {
  params: Promise<{
    treeId: string
  }>
}

export default async function TreeDetailPage({ params }: TreePageProps) {
  const { treeId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get tree
  const { data: tree } = await supabase
    .from('trees')
    .select('*')
    .eq('id', treeId)
    .single()

  if (!tree) {
    redirect('/tree')
  }

  // Check if user is member
  const { data: membership } = await supabase
    .from('tree_members')
    .select('*')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/tree')
  }

  // Get persons in tree
  const { data: persons } = await supabase
    .from('persons')
    .select('*')
    .eq('tree_id', treeId)
    .order('created_at', { ascending: true })

  // Get relations
  const { data: relations } = await supabase
    .from('relations')
    .select('*')
    .eq('tree_id', treeId)

  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <Link href="/tree" className="text-sm text-primary-600 hover:text-primary-700">
              ← Все деревья
            </Link>
            <LogoutButton />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tree.name}</h1>
              {tree.description && (
                <p className="text-gray-600 mt-1">{tree.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <ShareModal treeId={treeId} userId={user.id} shareCode={tree.share_code} />
              {canEdit && <AddPersonButton treeId={treeId} userId={user.id} />}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {persons && persons.length > 0 ? (
          <TreeView persons={persons} relations={relations || []} />
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Дерево пустое
            </h3>
            <p className="text-gray-600 mb-6">
              Добавьте первого человека, чтобы начать строить дерево
            </p>
            {canEdit && <AddPersonButton treeId={treeId} userId={user.id} />}
          </div>
        )}
      </main>
    </div>
  )
}
