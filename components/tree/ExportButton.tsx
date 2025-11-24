'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ExportButtonProps {
  treeId: string
}

export function ExportButton({ treeId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/tree/${treeId}/export`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export tree')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `family_tree_${treeId}.json`
      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Ошибка экспорта дерева')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <Download className="w-4 h-4 mr-2" />
        {loading ? 'Экспорт...' : 'Экспорт'}
      </Button>

      {error && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 w-64">
          {error}
        </div>
      )}
    </>
  )
}
