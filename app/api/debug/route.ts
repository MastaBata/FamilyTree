import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: persons } = await supabase
    .from('persons')
    .select('id, first_name, last_name')

  const { data: relations } = await supabase
    .from('relations')
    .select('id, person1_id, person2_id, relation_type')

  // Build readable output
  const output: string[] = []

  output.push('=== PERSONS ===')
  persons?.forEach(p => {
    output.push(`${p.id.slice(0, 8)}: ${p.first_name} ${p.last_name || ''}`)
  })

  output.push('\n=== RELATIONS ===')
  relations?.forEach(r => {
    const p1 = persons?.find(p => p.id === r.person1_id)
    const p2 = persons?.find(p => p.id === r.person2_id)
    const p1Name = p1 ? `${p1.first_name} ${p1.last_name || ''}` : r.person1_id.slice(0, 8)
    const p2Name = p2 ? `${p2.first_name} ${p2.last_name || ''}` : r.person2_id.slice(0, 8)
    output.push(`${r.relation_type}: ${p1Name} -> ${p2Name}`)
  })

  // Find roots
  const childIds = new Set(
    relations?.filter(r => r.relation_type === 'parent_child').map(r => r.person2_id)
  )
  const roots = persons?.filter(p => !childIds.has(p.id))

  output.push('\n=== ROOTS (no parents) ===')
  roots?.forEach(p => output.push(`  - ${p.first_name} ${p.last_name || ''}`))

  return NextResponse.json({
    persons,
    relations,
    roots: roots?.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name || ''}` })),
    debug: output.join('\n')
  })
}
