/**
 * Auto-create implied family relations in database
 * Called after creating a new relation to ensure all implied relations exist
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface Relation {
  id?: string
  tree_id: string
  person1_id: string
  person2_id: string
  relation_type: string
}

/**
 * Create implied relations after a new relation is added
 *
 * Rules:
 * 1. If parent has spouse and child, spouse is also parent of child
 * 2. If two people have same parent, they are siblings
 */
export async function createImpliedRelations(
  supabase: SupabaseClient,
  treeId: string
): Promise<void> {
  // Fetch all relations for this tree
  const { data: relations, error } = await supabase
    .from('relations')
    .select('id, person1_id, person2_id, relation_type')
    .eq('tree_id', treeId)

  if (error || !relations) {
    console.error('Error fetching relations:', error)
    return
  }

  const parentChildRels = relations.filter(r => r.relation_type === 'parent_child')
  const spouseRels = relations.filter(r => r.relation_type === 'spouse' || r.relation_type === 'ex_spouse')

  // Helper: get children of a person
  const getChildrenOf = (personId: string) =>
    parentChildRels.filter(r => r.person1_id === personId).map(r => r.person2_id)

  // Helper: get parents of a person
  const getParentsOf = (personId: string) =>
    parentChildRels.filter(r => r.person2_id === personId).map(r => r.person1_id)

  // Helper: get spouses of a person
  const getSpousesOf = (personId: string) =>
    spouseRels.filter(r => r.person1_id === personId || r.person2_id === personId)
      .map(r => r.person1_id === personId ? r.person2_id : r.person1_id)

  // Helper: check if parent_child relation exists
  const hasParentChildRel = (parentId: string, childId: string) =>
    parentChildRels.some(r => r.person1_id === parentId && r.person2_id === childId)

  const relationsToCreate: Relation[] = []

  // Rule 1: If parent has spouse and child, spouse should also be parent
  // (only if spouse has exactly one spouse - the parent)
  parentChildRels.forEach(rel => {
    const parentId = rel.person1_id
    const childId = rel.person2_id
    const parentSpouses = getSpousesOf(parentId)

    // If parent has exactly one spouse
    if (parentSpouses.length === 1) {
      const spouseId = parentSpouses[0]
      // Check if spouse also has only one spouse (the parent)
      const spouseSpouses = getSpousesOf(spouseId)
      if (spouseSpouses.length === 1 && spouseSpouses[0] === parentId) {
        // Check if spouse->child relation doesn't exist
        if (!hasParentChildRel(spouseId, childId)) {
          relationsToCreate.push({
            tree_id: treeId,
            person1_id: spouseId,
            person2_id: childId,
            relation_type: 'parent_child'
          })
        }
      }
    }
  })

  // Insert new relations
  if (relationsToCreate.length > 0) {
    const { error: insertError } = await supabase
      .from('relations')
      .insert(relationsToCreate)

    if (insertError) {
      console.error('Error creating implied relations:', insertError)
    }
  }
}

/**
 * Specifically handle when a spouse relation is created
 * If one spouse has children, create parent_child for the other spouse
 */
export async function handleSpouseRelationCreated(
  supabase: SupabaseClient,
  treeId: string,
  spouse1Id: string,
  spouse2Id: string
): Promise<void> {
  // Fetch all parent_child relations
  const { data: parentChildRels, error } = await supabase
    .from('relations')
    .select('person1_id, person2_id')
    .eq('tree_id', treeId)
    .eq('relation_type', 'parent_child')

  if (error || !parentChildRels) return

  const relationsToCreate: Relation[] = []

  // Get children of spouse1
  const spouse1Children = parentChildRels
    .filter(r => r.person1_id === spouse1Id)
    .map(r => r.person2_id)

  // Get children of spouse2
  const spouse2Children = parentChildRels
    .filter(r => r.person1_id === spouse2Id)
    .map(r => r.person2_id)

  // Add spouse2 as parent of spouse1's children
  spouse1Children.forEach(childId => {
    if (!spouse2Children.includes(childId)) {
      relationsToCreate.push({
        tree_id: treeId,
        person1_id: spouse2Id,
        person2_id: childId,
        relation_type: 'parent_child'
      })
    }
  })

  // Add spouse1 as parent of spouse2's children
  spouse2Children.forEach(childId => {
    if (!spouse1Children.includes(childId)) {
      relationsToCreate.push({
        tree_id: treeId,
        person1_id: spouse1Id,
        person2_id: childId,
        relation_type: 'parent_child'
      })
    }
  })

  if (relationsToCreate.length > 0) {
    await supabase.from('relations').insert(relationsToCreate)
  }
}

/**
 * Handle when a parent_child relation is created
 * If parent has spouse, also create parent_child for spouse
 */
export async function handleParentChildCreated(
  supabase: SupabaseClient,
  treeId: string,
  parentId: string,
  childId: string
): Promise<void> {
  // Get spouse relations for parent
  const { data: spouseRels, error: spouseError } = await supabase
    .from('relations')
    .select('person1_id, person2_id')
    .eq('tree_id', treeId)
    .or(`relation_type.eq.spouse,relation_type.eq.ex_spouse`)
    .or(`person1_id.eq.${parentId},person2_id.eq.${parentId}`)

  if (spouseError || !spouseRels) return

  // Filter to only include this parent's spouses
  const parentSpouses = spouseRels
    .filter(r => r.person1_id === parentId || r.person2_id === parentId)
    .map(r => r.person1_id === parentId ? r.person2_id : r.person1_id)

  if (parentSpouses.length !== 1) return // Only auto-create if exactly one spouse

  const spouseId = parentSpouses[0]

  // Check if spouse->child relation already exists
  const { data: existingRel } = await supabase
    .from('relations')
    .select('id')
    .eq('tree_id', treeId)
    .eq('person1_id', spouseId)
    .eq('person2_id', childId)
    .eq('relation_type', 'parent_child')
    .single()

  if (!existingRel) {
    await supabase.from('relations').insert({
      tree_id: treeId,
      person1_id: spouseId,
      person2_id: childId,
      relation_type: 'parent_child'
    })
  }
}
