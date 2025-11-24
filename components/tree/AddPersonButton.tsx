'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertCircle } from 'lucide-react'

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
  birth_date?: string | null
}

interface AddPersonButtonProps {
  treeId: string
  userId: string
  persons?: Person[]
}

export function AddPersonButton({ treeId, userId, persons = [] }: AddPersonButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isAlive, setIsAlive] = useState(true)
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Поля для связей
  const [relationType, setRelationType] = useState<string>('')
  const [relatedPersonId, setRelatedPersonId] = useState<string>('')

  // Duplicate detection
  const [potentialDuplicates, setPotentialDuplicates] = useState<Person[]>([])
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Добавляем человека
      const { data: newPerson, error: personError } = await supabase
        .from('persons')
        .insert({
          tree_id: treeId,
          first_name: firstName,
          last_name: lastName || null,
          middle_name: middleName || null,
          gender: gender || null,
          birth_date: birthDate || null,
          is_alive: isAlive,
          bio: bio || null,
          created_by: userId,
        })
        .select()
        .single()

      if (personError) throw personError

      // Если выбрана связь, создаем её
      if (relatedPersonId && relationType && newPerson) {
        let person1Id = relatedPersonId
        let person2Id = newPerson.id

        // Для parent_child связи: person1 = родитель, person2 = ребенок
        // Для spouse связи: порядок не важен
        if (relationType === 'child_parent') {
          // Если выбрано "Ребенок", то новый человек - родитель, а выбранный - ребенок
          person1Id = newPerson.id
          person2Id = relatedPersonId
        }

        const { error: relationError } = await supabase
          .from('relations')
          .insert({
            tree_id: treeId,
            person1_id: person1Id,
            person2_id: person2Id,
            relation_type: relationType === 'child_parent' ? 'parent_child' : relationType,
          })

        if (relationError) {
          console.error('Ошибка создания связи:', relationError)
          // Не бросаем ошибку, человек уже добавлен
        }
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Ошибка добавления человека')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setMiddleName('')
    setGender('')
    setBirthDate('')
    setIsAlive(true)
    setBio('')
    setRelationType('')
    setRelatedPersonId('')
    setPotentialDuplicates([])
  }

  const getPersonFullName = (person: Person) => {
    const parts = [person.last_name, person.first_name, person.middle_name].filter(Boolean)
    return parts.join(' ')
  }

  const checkForDuplicates = async () => {
    // Only check if we have first name and last name
    if (!firstName.trim() || !lastName.trim()) {
      setPotentialDuplicates([])
      return
    }

    setCheckingDuplicates(true)
    try {
      const supabase = createClient()

      // Build query to find similar persons
      let query = supabase
        .from('persons')
        .select('id, first_name, last_name, middle_name, birth_date')
        .eq('tree_id', treeId)
        .ilike('first_name', `%${firstName.trim()}%`)

      if (lastName.trim()) {
        query = query.ilike('last_name', `%${lastName.trim()}%`)
      }

      const { data: similarPersons } = await query.limit(5)

      // If birth year is provided, filter by approximate birth year (±2 years)
      if (birthDate && similarPersons) {
        const birthYear = new Date(birthDate).getFullYear()
        const filtered = similarPersons.filter(p => {
          if (!p.birth_date) return true // Include if no birth date
          const personYear = new Date(p.birth_date).getFullYear()
          return Math.abs(personYear - birthYear) <= 2
        })
        setPotentialDuplicates(filtered || [])
      } else {
        setPotentialDuplicates(similarPersons || [])
      }
    } catch (err) {
      console.error('Error checking duplicates:', err)
    } finally {
      setCheckingDuplicates(false)
    }
  }

  // Check for duplicates when name or birth date changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkForDuplicates()
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [firstName, lastName, birthDate])

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button>Добавить человека</Button>
      </ModalTrigger>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Добавить человека в дерево</ModalTitle>
            <ModalDescription>
              Заполните информацию о человеке
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 my-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Duplicate warning */}
            {potentialDuplicates.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                      Возможные дубликаты найдены
                    </h4>
                    <p className="text-xs text-yellow-800 mb-2">
                      Похожие люди уже есть в дереве. Убедитесь, что вы не добавляете дубликат:
                    </p>
                    <div className="space-y-1">
                      {potentialDuplicates.map((dup) => (
                        <div key={dup.id} className="text-xs text-yellow-900 bg-yellow-100 px-2 py-1 rounded">
                          {getPersonFullName(dup)}
                          {dup.birth_date && ` (${new Date(dup.birth_date).getFullYear()})`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Блок выбора связи */}
            {persons.length > 0 && (
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold text-primary-900">
                  Связь с другими людьми (необязательно)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип связи
                    </label>
                    <select
                      value={relationType}
                      onChange={(e) => {
                        setRelationType(e.target.value)
                        if (!e.target.value) setRelatedPersonId('')
                      }}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={loading}
                    >
                      <option value="">Без связи</option>
                      <option value="parent_child">Родитель для...</option>
                      <option value="child_parent">Ребенок для...</option>
                      <option value="spouse">Супруг(а) для...</option>
                    </select>
                  </div>

                  {relationType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Выбрать человека
                      </label>
                      <select
                        value={relatedPersonId}
                        onChange={(e) => setRelatedPersonId(e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={loading}
                        required={!!relationType}
                      >
                        <option value="">Выберите...</option>
                        {persons.map((person) => (
                          <option key={person.id} value={person.id}>
                            {getPersonFullName(person)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Имя *"
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Фамилия"
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>

            <Input
              label="Отчество"
              placeholder="Отчество"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              disabled={loading}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пол
                </label>
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

              <Input
                label="Дата рождения"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Биография
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Краткая биография..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
