import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-primary-800 mb-6">
          FamilyTree
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
          Создайте генеалогическое древо вашей семьи вместе с родственниками
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Начать бесплатно
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-semibold"
          >
            Войти
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">🌳</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Визуализация
            </h3>
            <p className="text-gray-600">
              Красивое интерактивное древо с фотографиями и связями
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Совместное редактирование
            </h3>
            <p className="text-gray-600">
              Приглашайте родственников и стройте древо вместе
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Фото и истории
            </h3>
            <p className="text-gray-600">
              Сохраняйте фотографии и биографии каждого человека
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
