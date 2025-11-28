'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { Calendar } from 'lucide-react'

export interface DateInputProps {
  label?: string
  value?: string  // ISO format: YYYY-MM-DD
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
  allowPartial?: boolean  // Allow just year or year-month
}

const months = [
  { value: '01', label: 'Январь' },
  { value: '02', label: 'Февраль' },
  { value: '03', label: 'Март' },
  { value: '04', label: 'Апрель' },
  { value: '05', label: 'Май' },
  { value: '06', label: 'Июнь' },
  { value: '07', label: 'Июль' },
  { value: '08', label: 'Август' },
  { value: '09', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
]

function parseDate(value: string | undefined): { day: string; month: string; year: string } {
  if (!value) return { day: '', month: '', year: '' }

  const parts = value.split('-')
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  }
}

function formatDate(day: string, month: string, year: string): string {
  if (!year) return ''
  if (!month) return year
  if (!day) return `${year}-${month}`
  return `${year}-${month}-${day.padStart(2, '0')}`
}

function getDaysInMonth(month: string, year: string): number {
  if (!month || !year) return 31
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  return new Date(y, m, 0).getDate()
}

export function DateInput({
  label,
  value,
  onChange,
  error,
  disabled,
  allowPartial = true,
}: DateInputProps) {
  const parsed = parseDate(value)
  const [day, setDay] = useState(parsed.day)
  const [month, setMonth] = useState(parsed.month)
  const [year, setYear] = useState(parsed.year)

  // Sync with external value
  useEffect(() => {
    const parsed = parseDate(value)
    setDay(parsed.day)
    setMonth(parsed.month)
    setYear(parsed.year)
  }, [value])

  const handleChange = (newDay: string, newMonth: string, newYear: string) => {
    // Validate day based on month/year
    const maxDays = getDaysInMonth(newMonth, newYear)
    let validDay = newDay
    if (newDay && parseInt(newDay, 10) > maxDays) {
      validDay = maxDays.toString()
    }

    setDay(validDay)
    setMonth(newMonth)
    setYear(newYear)

    if (onChange) {
      const formatted = formatDate(validDay, newMonth, newYear)
      onChange(formatted)
    }
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 2) val = val.slice(0, 2)
    if (parseInt(val, 10) > 31) val = '31'
    if (parseInt(val, 10) < 0) val = ''
    handleChange(val, month, year)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(day, e.target.value, year)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 4) val = val.slice(0, 4)
    handleChange(day, month, val)
  }

  const currentYear = new Date().getFullYear()
  const maxDays = getDaysInMonth(month, year)

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1">
          {/* Day */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="ДД"
              value={day}
              onChange={handleDayChange}
              disabled={disabled}
              maxLength={2}
              className={clsx(
                'w-14 h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-center',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-red-500 focus:ring-red-500'
              )}
            />
          </div>

          <span className="text-gray-400">/</span>

          {/* Month */}
          <select
            value={month}
            onChange={handleMonthChange}
            disabled={disabled}
            className={clsx(
              'h-10 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !month && 'text-gray-400',
              error && 'border-red-500 focus:ring-red-500'
            )}
          >
            <option value="">Месяц</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <span className="text-gray-400">/</span>

          {/* Year */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="ГГГГ"
              value={year}
              onChange={handleYearChange}
              disabled={disabled}
              maxLength={4}
              className={clsx(
                'w-20 h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-center',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-red-500 focus:ring-red-500'
              )}
            />
          </div>
        </div>

        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400">
          <Calendar className="w-5 h-5" />
        </div>
      </div>

      {/* Helper text */}
      {allowPartial && !error && (
        <p className="mt-1 text-xs text-gray-500">
          Можно указать только год или год и месяц
        </p>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
