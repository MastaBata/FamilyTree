import Link from 'next/link'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>
          Создайте аккаунт для начала работы с FamilyTree
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="text-sm text-center text-gray-600">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Войти
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
