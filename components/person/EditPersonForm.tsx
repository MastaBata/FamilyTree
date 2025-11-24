'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Person {
  id: string
  tree_id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
  maiden_name: string | null
  gender: string | null
  birth_date: string | null
  birth_date_approximate: boolean
  death_date: string | null
  death_date_approximate: boolean
  is_alive: boolean
  birth_place: string | null
  death_place: string | null
  current_location: string | null
  bio: string | null
  occupation: string | null
  religion: string | null
}

interface EditPersonFormProps {
  person: Person
  treeId: string
}

export function EditPersonForm({ person, treeId }: EditPersonFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [firstName, setFirstName] = useState(person.first_name)
  const [lastName, setLastName] = useState(person.last_name || '')
  const [middleName, setMiddleName] = useState(person.middle_name || '')
  const [maidenName, setMaidenName] = useState(person.maiden_name || '')
  const [gender, setGender] = useState(person.gender || '')
  const [birthDate, setBirthDate] = useState(person.birth_date || '')
  const [birthDateApproximate, setBirthDateApproximate] = useState(person.birth_date_approximate)
  const [deathDate, setDeathDate] = useState(person.death_date || '')
  const [deathDateApproximate, setDeathDateApproximate] = useState(person.death_date_approximate)
  const [isAlive, setIsAlive] = useState(person.is_alive)
  const [birthPlace, setBirthPlace] = useState(person.birth_place || '')
  const [deathPlace, setDeathPlace] = useState(person.death_place || '')
  const [currentLocation, setCurrentLocation] = useState(person.current_location || '')
  const [bio, setBio] = useState(person.bio || '')
  const [occupation, setOccupation] = useState(person.occupation || '')
  const [religion, setReligion] = useState(person.religion || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('persons')
        .update({
          first_name: firstName,
          last_name: lastName || null,
          middle_name: middleName || null,
          maiden_name: maidenName || null,
          gender: gender || null,
          birth_date: birthDate || null,
          birth_date_approximate: birthDateApproximate,
          death_date: deathDate || null,
          death_date_approximate: deathDateApproximate,
          is_alive: isAlive,
          birth_place: birthPlace || null,
          death_place: deathPlace || null,
          current_location: currentLocation || null,
          bio: bio || null,
          occupation: occupation || null,
          religion: religion || null,
        })
        .eq('id', person.id)

      if (updateError) throw updateError

      router.push(`/tree/${treeId}/person/${person.id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Ошибка сохранения изменений')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Имя *"
              placeholder="Иван"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              label="Фамилия"
              placeholder="Иванов"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Отчество"
              placeholder="Иванович"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              disabled={loading}
            />

            <Input
              label="Девичья фамилия"
              placeholder="Для женщин"
              value={maidenName}
              onChange={(e) => setMaidenName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Даты</h3>
        <div className="space-y-4">
          <div>
            <Input
              label="Дата рождения"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading}
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="birthDateApproximate"
                checked={birthDateApproximate}
                onChange={(e) => setBirthDateApproximate(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={loading}
              />
              <label htmlFor="birthDateApproximate" className="text-sm text-gray-700">
                Примерная дата
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAlive"
              checked={isAlive}
              onChange={(e) => setIsAlive(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              disabled={loading}
            />
            <label htmlFor="isAlive" className="text-sm font-medium text-gray-700">
              Жив
            </label>
          </div>

          {!isAlive && (
            <div>
              <Input
                label="Дата смерти"
                type="date"
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                disabled={loading}
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deathDateApproximate"
                  checked={deathDateApproximate}
                  onChange={(e) => setDeathDateApproximate(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  disabled={loading}
                />
                <label htmlFor="deathDateApproximate" className="text-sm text-gray-700">
                  Примерная дата
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Places */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Места</h3>
        <div className="space-y-4">
          <Input
            label="Место рождения"
            placeholder="Москва, Россия"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            disabled={loading}
          />

          {!isAlive && (
            <Input
              label="Место смерти"
              placeholder="Москва, Россия"
              value={deathPlace}
              onChange={(e) => setDeathPlace(e.target.value)}
              disabled={loading}
            />
          )}

          {isAlive && (
            <Input
              label="Место проживания"
              placeholder="Санкт-Петербург, Россия"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Additional info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Дополнительная информация</h3>
        <div className="space-y-4">
          <Input
            label="Профессия"
            placeholder="Инженер"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Религия"
            placeholder="Православие"
            value={religion}
            onChange={(e) => setReligion(e.target.value)}
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Биография</label>
            <textarea
              className="flex min-h-[150px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Краткая биография..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </div>
    </form>
  )
}
