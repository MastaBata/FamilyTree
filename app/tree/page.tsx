import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/auth/UserMenu'
import { CreateTreeModal } from '@/components/tree/CreateTreeModal'

export default async function TreePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: trees } = await supabase
    .from('trees')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-800">FamilyTree</h1>
          <UserMenu userEmail={user.email} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Мои деревья</h2>
            <p className="text-gray-600">Создайте или выберите дерево для работы</p>
          </div>
          {trees && trees.length > 0 && <CreateTreeModal userId={user.id} />}
        </div>

        {trees && trees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <Link
                key={tree.id}
                href={`/tree/${tree.id}`}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {tree.name}
                </h3>
                {tree.description && (
                  <p className="text-gray-600 text-sm">{tree.description}</p>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  Создано: {new Date(tree.created_at).toLocaleDateString('ru-RU')}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🌳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              У вас пока нет деревьев
            </h3>
            <p className="text-gray-600 mb-6">
              Создайте первое семейное дерево, чтобы начать
            </p>
            <CreateTreeModal userId={user.id} />
          </div>
        )}
      </main>
    </div>
  )
}
