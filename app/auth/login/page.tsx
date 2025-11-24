import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>
          Войдите в свой аккаунт FamilyTree
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="text-sm text-center text-gray-600">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Зарегистрируйтесь
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
