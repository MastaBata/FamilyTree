// Debug script to analyze tree structure
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get all persons
  const { data: persons, error: personsError } = await supabase
    .from('persons')
    .select('id, first_name, last_name')

  if (personsError) {
    console.error('Error fetching persons:', personsError)
    return
  }

  console.log('\n=== PERSONS ===')
  persons?.forEach(p => {
    console.log(`${p.id}: ${p.first_name} ${p.last_name || ''}`)
  })

  // Get all relations
  const { data: relations, error: relationsError } = await supabase
    .from('relations')
    .select('id, person1_id, person2_id, relation_type')

  if (relationsError) {
    console.error('Error fetching relations:', relationsError)
    return
  }

  console.log('\n=== RELATIONS ===')
  relations?.forEach(r => {
    const p1 = persons?.find(p => p.id === r.person1_id)
    const p2 = persons?.find(p => p.id === r.person2_id)
    const p1Name = p1 ? `${p1.first_name} ${p1.last_name || ''}` : r.person1_id
    const p2Name = p2 ? `${p2.first_name} ${p2.last_name || ''}` : r.person2_id
    console.log(`${r.relation_type}: ${p1Name} -> ${p2Name}`)
  })

  // Analyze generations
  console.log('\n=== GENERATION ANALYSIS ===')

  // Find people without parents (roots)
  const childIds = new Set(
    relations?.filter(r => r.relation_type === 'parent_child').map(r => r.person2_id)
  )
  const roots = persons?.filter(p => !childIds.has(p.id))
  console.log('\nRoots (no parents):')
  roots?.forEach(p => console.log(`  - ${p.first_name} ${p.last_name || ''}`))
}

main()
