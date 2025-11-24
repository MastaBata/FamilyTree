import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AddPersonButton } from '@/components/tree/AddPersonButton'

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
            {canEdit && <AddPersonButton treeId={treeId} userId={user.id} />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {persons && persons.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Люди в дереве ({persons.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {persons.map((person) => (
                <div
                  key={person.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.first_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-lg">
                        {person.first_name[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {person.first_name} {person.last_name}
                      </h3>
                      {person.birth_date && (
                        <p className="text-sm text-gray-600">
                          {person.is_alive ? 'Родился' : 'Жил'}:{' '}
                          {new Date(person.birth_date).toLocaleDateString('ru-RU')}
                          {person.death_date &&
                            ` - ${new Date(person.death_date).toLocaleDateString('ru-RU')}`}
                        </p>
                      )}
                      {person.bio && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {person.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
