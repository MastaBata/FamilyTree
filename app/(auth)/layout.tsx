import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center mb-8">
          <h1 className="text-3xl font-bold text-primary-800">FamilyTree</h1>
        </Link>
        {children}
      </div>
    </div>
  )
}
