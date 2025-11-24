import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/auth/UserMenu'
import { EditPersonForm } from '@/components/person/EditPersonForm'

interface EditPersonPageProps {
  params: Promise<{
    treeId: string
    personId: string
  }>
}

export default async function EditPersonPage({ params }: EditPersonPageProps) {
  const { treeId, personId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is member of this tree
  const { data: membership } = await supabase
    .from('tree_members')
    .select('*')
    .eq('tree_id', treeId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/tree')
  }

  // Check if user has edit permissions
  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role)
  if (!canEdit) {
    redirect(`/tree/${treeId}/person/${personId}`)
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

  // Get person
  const { data: person } = await supabase
    .from('persons')
    .select('*')
    .eq('id', personId)
    .eq('tree_id', treeId)
    .single()

  if (!person) {
    redirect(`/tree/${treeId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <Link
              href={`/tree/${treeId}/person/${personId}`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              ← Назад к профилю
            </Link>
            <UserMenu userEmail={user.email} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Редактирование: {person.first_name} {person.last_name}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <EditPersonForm person={person} treeId={treeId} />
        </div>
      </main>
    </div>
  )
}
