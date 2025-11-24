import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/auth/UserMenu'
import { PersonContacts } from '@/components/person/PersonContacts'
import { CustomSections } from '@/components/person/CustomSections'
import { User, Calendar, MapPin, Heart, Users } from 'lucide-react'

interface PersonPageProps {
  params: Promise<{
    treeId: string
    personId: string
  }>
}

export default async function PersonPage({ params }: PersonPageProps) {
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

  // Get relations
  const { data: relations } = await supabase
    .from('relations')
    .select(`
      *,
      person1:person1_id(id, first_name, last_name, middle_name),
      person2:person2_id(id, first_name, last_name, middle_name)
    `)
    .or(`person1_id.eq.${personId},person2_id.eq.${personId}`)
    .eq('tree_id', treeId)

  // Get contacts
  const { data: contacts } = await supabase
    .from('person_contacts')
    .select('*')
    .eq('person_id', personId)
    .order('sort_order', { ascending: true })

  // Get custom sections
  const { data: customSections } = await supabase
    .from('custom_sections')
    .select('*')
    .eq('person_id', personId)
    .order('sort_order', { ascending: true })

  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role)

  const formatFullName = () => {
    const parts = [person.last_name, person.first_name, person.middle_name].filter(Boolean)
    return parts.join(' ')
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getYears = () => {
    const birth = person.birth_date ? new Date(person.birth_date).getFullYear() : '?'
    if (!person.is_alive && person.death_date) {
      const death = new Date(person.death_date).getFullYear()
      return `${birth} — ${death}`
    }
    return `${birth}`
  }

  // Group relations
  const parents: any[] = []
  const children: any[] = []
  const spouses: any[] = []

  relations?.forEach((rel: any) => {
    if (rel.relation_type === 'parent_child') {
      if (rel.person2_id === personId) {
        // person1 is parent
        parents.push(rel.person1)
      } else {
        // person2 is child
        children.push(rel.person2)
      }
    } else if (rel.relation_type === 'spouse') {
      const spouse = rel.person1_id === personId ? rel.person2 : rel.person1
      spouses.push(spouse)
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <Link
              href={`/tree/${treeId}`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              ← Вернуться к дереву
            </Link>
            <UserMenu userEmail={user.email} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{tree.name}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header with photo */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-12">
            <div className="flex items-center gap-6">
              {person.avatar_url ? (
                <img
                  src={person.avatar_url}
                  alt={formatFullName()}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {formatFullName()}
                </h2>
                <p className="text-primary-100 text-lg">{getYears()}</p>
                {person.maiden_name && (
                  <p className="text-primary-100 text-sm mt-1">
                    Девичья фамилия: {person.maiden_name}
                  </p>
                )}
              </div>
              {canEdit && (
                <Link
                  href={`/tree/${treeId}/person/${personId}/edit`}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                >
                  Редактировать
                </Link>
              )}
            </div>
          </div>

          {/* Info section */}
          <div className="p-8 space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {person.gender && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Пол</p>
                    <p className="text-gray-900">
                      {person.gender === 'male' ? 'Мужской' : 'Женский'}
                    </p>
                  </div>
                </div>
              )}

              {person.birth_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Дата рождения</p>
                    <p className="text-gray-900">
                      {formatDate(person.birth_date)}
                      {person.birth_date_approximate && ' (примерно)'}
                    </p>
                  </div>
                </div>
              )}

              {person.birth_place && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Место рождения</p>
                    <p className="text-gray-900">{person.birth_place}</p>
                  </div>
                </div>
              )}

              {!person.is_alive && person.death_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Дата смерти</p>
                    <p className="text-gray-900">
                      {formatDate(person.death_date)}
                      {person.death_date_approximate && ' (примерно)'}
                    </p>
                  </div>
                </div>
              )}

              {person.occupation && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Профессия</p>
                    <p className="text-gray-900">{person.occupation}</p>
                  </div>
                </div>
              )}

              {person.current_location && person.is_alive && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Место проживания</p>
                    <p className="text-gray-900">{person.current_location}</p>
                  </div>
                </div>
              )}

              {!person.is_alive && person.death_place && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Место смерти</p>
                    <p className="text-gray-900">{person.death_place}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional info grid */}
            {(person.nickname || person.education || person.military_service || person.awards || person.hobbies || person.religion) && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Дополнительная информация
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {person.nickname && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Прозвище</p>
                        <p className="text-gray-900">{person.nickname}</p>
                      </div>
                    </div>
                  )}

                  {person.education && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Образование</p>
                        <p className="text-gray-900">{person.education}</p>
                      </div>
                    </div>
                  )}

                  {person.military_service && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Военная служба</p>
                        <p className="text-gray-900">{person.military_service}</p>
                      </div>
                    </div>
                  )}

                  {person.awards && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Награды</p>
                        <p className="text-gray-900">{person.awards}</p>
                      </div>
                    </div>
                  )}

                  {person.hobbies && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Хобби и интересы</p>
                        <p className="text-gray-900">{person.hobbies}</p>
                      </div>
                    </div>
                  )}

                  {person.religion && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Религия</p>
                        <p className="text-gray-900">{person.religion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bio */}
            {person.bio && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Биография
                </h3>
                <p className="text-gray-700 whitespace-pre-line">{person.bio}</p>
              </div>
            )}

            {/* Interesting facts */}
            {person.interesting_facts && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Интересные факты
                </h3>
                <p className="text-gray-700 whitespace-pre-line">{person.interesting_facts}</p>
              </div>
            )}

            {/* Death information */}
            {!person.is_alive && (person.cause_of_death || person.burial_place) && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Информация о смерти
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {person.cause_of_death && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Причина смерти</p>
                        <p className="text-gray-900">{person.cause_of_death}</p>
                      </div>
                    </div>
                  )}

                  {person.burial_place && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Место захоронения</p>
                        <p className="text-gray-900">{person.burial_place}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contacts */}
            <PersonContacts
              personId={personId}
              treeId={treeId}
              canEdit={canEdit}
              initialContacts={contacts || []}
            />

            {/* Custom sections */}
            <CustomSections
              personId={personId}
              canEdit={canEdit}
              initialSections={customSections || []}
            />

            {/* Relations */}
            {(parents.length > 0 || spouses.length > 0 || children.length > 0) && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Родственные связи
                </h3>

                <div className="space-y-4">
                  {parents.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Родители:
                      </p>
                      <div className="space-y-2">
                        {parents.map((parent: any) => (
                          <Link
                            key={parent.id}
                            href={`/tree/${treeId}/person/${parent.id}`}
                            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {[parent.last_name, parent.first_name, parent.middle_name]
                              .filter(Boolean)
                              .join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {spouses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Супруг(а):
                      </p>
                      <div className="space-y-2">
                        {spouses.map((spouse: any) => (
                          <Link
                            key={spouse.id}
                            href={`/tree/${treeId}/person/${spouse.id}`}
                            className="block p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                          >
                            {[spouse.last_name, spouse.first_name, spouse.middle_name]
                              .filter(Boolean)
                              .join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {children.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Дети:</p>
                      <div className="space-y-2">
                        {children.map((child: any) => (
                          <Link
                            key={child.id}
                            href={`/tree/${treeId}/person/${child.id}`}
                            className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {[child.last_name, child.first_name, child.middle_name]
                              .filter(Boolean)
                              .join(' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
