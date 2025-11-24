import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface InvitePageProps {
  params: Promise<{
    code: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get tree by share code
  const { data: tree } = await supabase
    .from('trees')
    .select('*')
    .eq('share_code', code)
    .single()

  if (!tree) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Приглашение не найдено</CardTitle>
            <CardDescription>
              Эта ссылка-приглашение недействительна или устарела
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">На главную</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If not logged in, redirect to register
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Приглашение в семейное дерево</CardTitle>
            <CardDescription>
              Вы приглашены в дерево <strong>{tree.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tree.description && (
              <p className="text-sm text-gray-600">{tree.description}</p>
            )}
            <div className="space-y-2">
              <Link href="/auth/register">
                <Button className="w-full">Зарегистрироваться</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Уже есть аккаунт? Войти
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('tree_members')
    .select('*')
    .eq('tree_id', tree.id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    redirect(`/tree/${tree.id}`)
  }

  // Add user as member
  const { error } = await supabase
    .from('tree_members')
    .insert({
      tree_id: tree.id,
      user_id: user.id,
      role: 'editor',
    })

  if (error) {
    console.error('Error adding member:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Ошибка</CardTitle>
            <CardDescription>
              Не удалось присоединиться к дереву
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/tree">
              <Button className="w-full">К моим деревьям</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Redirect to tree
  redirect(`/tree/${tree.id}`)
}
