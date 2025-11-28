/**
 * Classic Family Tree Layout
 *
 * Rules:
 * 1. Generations are arranged top to bottom (oldest at top)
 * 2. Spouses are placed next to each other
 * 3. Children are centered below their parents
 */

interface Person {
  id: string
  first_name: string
  last_name: string | null
  position_x: number
  position_y: number
}

interface Relation {
  person1_id: string
  person2_id: string
  relation_type: string
}

interface LayoutPosition {
  id: string
  x: number
  y: number
}

// Calculate node width based on name (same logic as PersonNode)
function calculateNodeWidth(firstName: string, lastName?: string | null): number {
  const fullName = `${firstName} ${lastName || ''}`.trim()
  const textWidth = fullName.length * 8
  const minWidth = 150
  const maxWidth = 300
  return Math.min(maxWidth, Math.max(minWidth, 88 + textWidth))
}

const DEFAULT_NODE_WIDTH = 180
const HORIZONTAL_GAP = 100
const VERTICAL_SPACING = 220
const SPOUSE_GAP = 60  // Fixed gap between spouse nodes

export function classicTreeLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  if (persons.length === 0) return []

  // Build person map for quick lookup
  const personMap = new Map<string, Person>()
  persons.forEach(p => personMap.set(p.id, p))

  // Get node width for a person
  function getNodeWidth(personId: string): number {
    const person = personMap.get(personId)
    if (!person) return DEFAULT_NODE_WIDTH
    return calculateNodeWidth(person.first_name, person.last_name)
  }

  // Build relationship maps
  const children = new Map<string, Set<string>>() // parent -> children
  const parents = new Map<string, Set<string>>()  // child -> parents
  const spouses = new Map<string, Set<string>>()  // person -> spouses

  persons.forEach(p => {
    children.set(p.id, new Set())
    parents.set(p.id, new Set())
    spouses.set(p.id, new Set())
  })

  relations.forEach(r => {
    if (r.relation_type === 'parent_child') {
      children.get(r.person1_id)?.add(r.person2_id)
      parents.get(r.person2_id)?.add(r.person1_id)
    } else if (r.relation_type === 'spouse' || r.relation_type === 'ex_spouse') {
      spouses.get(r.person1_id)?.add(r.person2_id)
      spouses.get(r.person2_id)?.add(r.person1_id)
    }
  })

  // Assign generations
  const generations = new Map<string, number>()

  // Find TRUE roots - people who have no parents AND whose spouse also has no parents
  // If someone has no parents but their spouse does, they are NOT a root
  function isRoot(personId: string): boolean {
    if ((parents.get(personId)?.size || 0) > 0) return false

    // Check if any spouse has parents - if so, this person is not a root
    const personSpouses = spouses.get(personId) || new Set()
    for (const spouseId of personSpouses) {
      if ((parents.get(spouseId)?.size || 0) > 0) return false
    }

    return true
  }

  const roots = persons.filter(p => isRoot(p.id))

  // BFS to assign generations - start from roots, go down
  const queue: { id: string; gen: number }[] = []
  const visited = new Set<string>()

  // Initialize queue with roots
  roots.forEach(root => {
    queue.push({ id: root.id, gen: 0 })
  })

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!

    if (visited.has(id)) continue
    visited.add(id)
    generations.set(id, gen)

    // Spouse gets same generation
    spouses.get(id)?.forEach(spouseId => {
      if (!visited.has(spouseId)) {
        visited.add(spouseId)
        generations.set(spouseId, gen)
      }
    })

    // Children get next generation
    children.get(id)?.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, gen: gen + 1 })
      }
    })
  }

  // Handle disconnected persons - put them at generation 0
  persons.forEach(p => {
    if (!generations.has(p.id)) {
      generations.set(p.id, 0)
    }
  })

  // Get all children of a couple
  function getChildrenOf(personId: string): string[] {
    const result = new Set<string>()
    children.get(personId)?.forEach(c => result.add(c))
    spouses.get(personId)?.forEach(spouseId => {
      children.get(spouseId)?.forEach(c => result.add(c))
    })
    return Array.from(result)
  }

  // Calculate subtree widths
  const subtreeWidths = new Map<string, number>()
  const calculated = new Set<string>()

  function calcSubtreeWidth(personId: string): number {
    if (subtreeWidths.has(personId)) return subtreeWidths.get(personId)!
    if (calculated.has(personId)) return getNodeWidth(personId) // Prevent infinite recursion

    calculated.add(personId)
    const personChildren = getChildrenOf(personId)
    const myWidth = getNodeWidth(personId)

    if (personChildren.length === 0) {
      const spouseList = Array.from(spouses.get(personId) || new Set())
      if (spouseList.length > 0) {
        const spouseWidth = getNodeWidth(spouseList[0])
        const width = myWidth + SPOUSE_GAP + spouseWidth
        subtreeWidths.set(personId, width)
        return width
      }
      subtreeWidths.set(personId, myWidth)
      return myWidth
    }

    let totalChildWidth = 0
    personChildren.forEach((childId, idx) => {
      totalChildWidth += calcSubtreeWidth(childId)
      if (idx < personChildren.length - 1) {
        totalChildWidth += HORIZONTAL_GAP
      }
    })

    const spouseList = Array.from(spouses.get(personId) || new Set())
    let parentsWidth = myWidth
    if (spouseList.length > 0) {
      const spouseWidth = getNodeWidth(spouseList[0])
      parentsWidth = myWidth + SPOUSE_GAP + spouseWidth
    }
    const width = Math.max(totalChildWidth, parentsWidth)

    subtreeWidths.set(personId, width)
    return width
  }

  // Calculate widths for all roots
  roots.forEach(root => calcSubtreeWidth(root.id))

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>()

  function positionFamily(personId: string, centerX: number, gen: number) {
    if (positions.has(personId)) return

    const y = gen * VERTICAL_SPACING
    const spouseSet = spouses.get(personId) || new Set()
    const spouseList = Array.from(spouseSet).filter(s => !positions.has(s))
    const myWidth = getNodeWidth(personId)

    // Position person and spouse
    if (spouseList.length > 0) {
      const spouseWidth = getNodeWidth(spouseList[0])
      const coupleWidth = myWidth + SPOUSE_GAP + spouseWidth
      positions.set(personId, { x: centerX - coupleWidth / 2 + myWidth / 2, y })
      positions.set(spouseList[0], { x: centerX + coupleWidth / 2 - spouseWidth / 2, y })
    } else {
      positions.set(personId, { x: centerX, y })
    }

    // Position children
    const personChildren = getChildrenOf(personId)
    if (personChildren.length === 0) return

    let totalChildWidth = 0
    personChildren.forEach((childId, idx) => {
      totalChildWidth += subtreeWidths.get(childId) || getNodeWidth(childId)
      if (idx < personChildren.length - 1) {
        totalChildWidth += HORIZONTAL_GAP
      }
    })

    let currentX = centerX - totalChildWidth / 2

    personChildren.forEach(childId => {
      const childWidth = subtreeWidths.get(childId) || getNodeWidth(childId)
      const childCenterX = currentX + childWidth / 2
      const childGen = generations.get(childId) || gen + 1
      positionFamily(childId, childCenterX, childGen)
      currentX += childWidth + HORIZONTAL_GAP
    })
  }

  // Position all root families
  let currentX = 0
  roots.forEach(root => {
    if (!positions.has(root.id)) {
      const width = subtreeWidths.get(root.id) || NODE_WIDTH
      positionFamily(root.id, currentX + width / 2, 0)
      currentX += width + HORIZONTAL_GAP * 2
    }
  })

  // Handle unpositioned persons
  persons.forEach(p => {
    if (!positions.has(p.id)) {
      const gen = generations.get(p.id) || 0
      positions.set(p.id, { x: currentX, y: gen * VERTICAL_SPACING })
      currentX += getNodeWidth(p.id) + HORIZONTAL_GAP
    }
  })

  // Center the tree
  let minX = Infinity, maxX = -Infinity
  positions.forEach(pos => {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
  })
  const offsetX = -(minX + maxX) / 2

  // Convert to result
  const result: LayoutPosition[] = []
  positions.forEach((pos, id) => {
    result.push({ id, x: pos.x + offsetX, y: pos.y })
  })

  return result
}

export type LayoutType = 'classic' | 'vertical' | 'horizontal' | 'radial' | 'compact' | 'force'

export function applyLayout(
  persons: Person[],
  relations: Relation[],
  layoutType: LayoutType
): LayoutPosition[] {
  return classicTreeLayout(persons, relations)
}
