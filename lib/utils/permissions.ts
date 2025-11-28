/**
 * Permission utilities for family tree editing
 *
 * Rules:
 * - Owner can edit everything
 * - Linked users can edit: themselves, parents, children, siblings
 */

interface Relation {
  person1_id: string
  person2_id: string
  relation_type: string
}

/**
 * Get all person IDs that a linked user can edit
 */
export function getEditablePersonIds(
  linkedPersonId: string,
  relations: Relation[]
): Set<string> {
  const editableIds = new Set<string>()

  // Can edit self
  editableIds.add(linkedPersonId)

  // Find parents (where linkedPerson is child)
  relations.forEach(rel => {
    if (rel.relation_type === 'parent_child' && rel.person2_id === linkedPersonId) {
      editableIds.add(rel.person1_id) // parent
    }
  })

  // Find children (where linkedPerson is parent)
  relations.forEach(rel => {
    if (rel.relation_type === 'parent_child' && rel.person1_id === linkedPersonId) {
      editableIds.add(rel.person2_id) // child
    }
  })

  // Find siblings (share same parents)
  const myParents = new Set<string>()
  relations.forEach(rel => {
    if (rel.relation_type === 'parent_child' && rel.person2_id === linkedPersonId) {
      myParents.add(rel.person1_id)
    }
  })

  // Find all children of my parents (my siblings)
  relations.forEach(rel => {
    if (rel.relation_type === 'parent_child' && myParents.has(rel.person1_id)) {
      editableIds.add(rel.person2_id) // sibling
    }
  })

  // Direct sibling relations
  relations.forEach(rel => {
    if (rel.relation_type === 'sibling') {
      if (rel.person1_id === linkedPersonId) {
        editableIds.add(rel.person2_id)
      } else if (rel.person2_id === linkedPersonId) {
        editableIds.add(rel.person1_id)
      }
    }
  })

  return editableIds
}

/**
 * Check if user can edit a specific person
 */
export function canEditPerson(
  userRole: string,
  linkedPersonId: string | null,
  targetPersonId: string,
  relations: Relation[]
): boolean {
  // Owner can edit everyone
  if (userRole === 'owner') return true

  // Admin can edit everyone
  if (userRole === 'admin') return true

  // Viewer cannot edit anyone
  if (userRole === 'viewer') return false

  // Editor without link cannot edit anyone
  if (!linkedPersonId) return false

  // Editor with link can edit related persons
  const editableIds = getEditablePersonIds(linkedPersonId, relations)
  return editableIds.has(targetPersonId)
}

/**
 * Check if user can add relatives to a specific person
 */
export function canAddRelativeTo(
  userRole: string,
  linkedPersonId: string | null,
  targetPersonId: string,
  relations: Relation[]
): boolean {
  // Same logic as editing
  return canEditPerson(userRole, linkedPersonId, targetPersonId, relations)
}
