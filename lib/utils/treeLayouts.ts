/**
 * Tree layout algorithms for different visualization styles
 */

interface Person {
  id: string
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

const HORIZONTAL_SPACING = 250
const VERTICAL_SPACING = 180
const RADIAL_RADIUS = 150

/**
 * Build graph structure
 */
function buildGraph(persons: Person[], relations: Relation[]) {
  const graph = new Map<string, Set<string>>()
  const children = new Map<string, Set<string>>()
  const parents = new Map<string, Set<string>>()

  persons.forEach((p) => {
    graph.set(p.id, new Set())
    children.set(p.id, new Set())
    parents.set(p.id, new Set())
  })

  relations.forEach((rel) => {
    if (rel.relation_type === 'parent_child') {
      // person1 is parent, person2 is child
      children.get(rel.person1_id)?.add(rel.person2_id)
      parents.get(rel.person2_id)?.add(rel.person1_id)
      graph.get(rel.person1_id)?.add(rel.person2_id)
    }
  })

  return { graph, children, parents }
}

/**
 * Find root nodes (people without parents)
 */
function findRoots(persons: Person[], parents: Map<string, Set<string>>): string[] {
  return persons.filter((p) => parents.get(p.id)?.size === 0).map((p) => p.id)
}

/**
 * Vertical Tree Layout (traditional family tree)
 */
export function verticalTreeLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  const { children, parents } = buildGraph(persons, relations)
  const roots = findRoots(persons, parents)
  const positions: LayoutPosition[] = []
  const visited = new Set<string>()

  // Level-based positioning
  const levels = new Map<string, number>()

  function assignLevels(personId: string, level: number) {
    if (visited.has(personId)) return
    visited.add(personId)
    levels.set(personId, level)

    const personChildren = children.get(personId) || new Set()
    personChildren.forEach((childId) => {
      assignLevels(childId, level + 1)
    })
  }

  // Assign levels starting from roots
  roots.forEach((rootId) => assignLevels(rootId, 0))

  // Position remaining nodes
  persons.forEach((p) => {
    if (!visited.has(p.id)) {
      levels.set(p.id, 0)
    }
  })

  // Group by level
  const levelGroups = new Map<number, string[]>()
  levels.forEach((level, personId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(personId)
  })

  // Position nodes
  levelGroups.forEach((personIds, level) => {
    const levelWidth = personIds.length * HORIZONTAL_SPACING
    const startX = -levelWidth / 2

    personIds.forEach((personId, index) => {
      positions.push({
        id: personId,
        x: startX + index * HORIZONTAL_SPACING,
        y: level * VERTICAL_SPACING,
      })
    })
  })

  return positions
}

/**
 * Horizontal Tree Layout (left to right)
 */
export function horizontalTreeLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  const { children, parents } = buildGraph(persons, relations)
  const roots = findRoots(persons, parents)
  const positions: LayoutPosition[] = []
  const visited = new Set<string>()
  const levels = new Map<string, number>()

  function assignLevels(personId: string, level: number) {
    if (visited.has(personId)) return
    visited.add(personId)
    levels.set(personId, level)

    const personChildren = children.get(personId) || new Set()
    personChildren.forEach((childId) => {
      assignLevels(childId, level + 1)
    })
  }

  roots.forEach((rootId) => assignLevels(rootId, 0))

  persons.forEach((p) => {
    if (!visited.has(p.id)) {
      levels.set(p.id, 0)
    }
  })

  // Group by level
  const levelGroups = new Map<number, string[]>()
  levels.forEach((level, personId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(personId)
  })

  // Position nodes (swap X and Y from vertical)
  levelGroups.forEach((personIds, level) => {
    const levelHeight = personIds.length * VERTICAL_SPACING
    const startY = -levelHeight / 2

    personIds.forEach((personId, index) => {
      positions.push({
        id: personId,
        x: level * HORIZONTAL_SPACING,
        y: startY + index * VERTICAL_SPACING,
      })
    })
  })

  return positions
}

/**
 * Radial/Circular Tree Layout
 */
export function radialTreeLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  const { children, parents } = buildGraph(persons, relations)
  const roots = findRoots(persons, parents)
  const positions: LayoutPosition[] = []
  const visited = new Set<string>()
  const levels = new Map<string, number>()

  function assignLevels(personId: string, level: number) {
    if (visited.has(personId)) return
    visited.add(personId)
    levels.set(personId, level)

    const personChildren = children.get(personId) || new Set()
    personChildren.forEach((childId) => {
      assignLevels(childId, level + 1)
    })
  }

  roots.forEach((rootId) => assignLevels(rootId, 0))

  persons.forEach((p) => {
    if (!visited.has(p.id)) {
      levels.set(p.id, 0)
    }
  })

  // Group by level
  const levelGroups = new Map<number, string[]>()
  levels.forEach((level, personId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level)!.push(personId)
  })

  // Position nodes in concentric circles
  levelGroups.forEach((personIds, level) => {
    const radius = level * RADIAL_RADIUS
    const angleStep = (2 * Math.PI) / Math.max(personIds.length, 1)

    personIds.forEach((personId, index) => {
      const angle = index * angleStep - Math.PI / 2 // Start from top

      positions.push({
        id: personId,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      })
    })
  })

  return positions
}

/**
 * Compact Layout (grid-based)
 */
export function compactGridLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  const positions: LayoutPosition[] = []
  const cols = Math.ceil(Math.sqrt(persons.length))

  persons.forEach((person, index) => {
    const row = Math.floor(index / cols)
    const col = index % cols

    positions.push({
      id: person.id,
      x: col * HORIZONTAL_SPACING,
      y: row * VERTICAL_SPACING,
    })
  })

  return positions
}

/**
 * Force-directed Layout (physics-based)
 */
export function forceDirectedLayout(persons: Person[], relations: Relation[]): LayoutPosition[] {
  // Simple force-directed algorithm
  const positions: LayoutPosition[] = []
  const nodePositions = new Map<string, { x: number; y: number }>()

  // Initialize with random positions
  persons.forEach((person) => {
    nodePositions.set(person.id, {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 1000 - 500,
    })
  })

  // Simulate forces
  const iterations = 50
  const repulsionForce = 10000
  const attractionForce = 0.01
  const damping = 0.9

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>()

    // Initialize forces
    persons.forEach((p) => {
      forces.set(p.id, { x: 0, y: 0 })
    })

    // Repulsion between all nodes
    persons.forEach((p1) => {
      persons.forEach((p2) => {
        if (p1.id === p2.id) return

        const pos1 = nodePositions.get(p1.id)!
        const pos2 = nodePositions.get(p2.id)!

        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const force = repulsionForce / (distance * distance)
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force

        const f1 = forces.get(p1.id)!
        f1.x += fx
        f1.y += fy
      })
    })

    // Attraction along edges
    relations.forEach((rel) => {
      const pos1 = nodePositions.get(rel.person1_id)
      const pos2 = nodePositions.get(rel.person2_id)

      if (!pos1 || !pos2) return

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const force = distance * attractionForce
      const fx = (dx / distance) * force
      const fy = (dy / distance) * force

      const f1 = forces.get(rel.person1_id)!
      const f2 = forces.get(rel.person2_id)!

      f1.x += fx
      f1.y += fy
      f2.x -= fx
      f2.y -= fy
    })

    // Apply forces
    persons.forEach((p) => {
      const pos = nodePositions.get(p.id)!
      const force = forces.get(p.id)!

      pos.x += force.x * damping
      pos.y += force.y * damping
    })
  }

  // Convert to positions array
  nodePositions.forEach((pos, id) => {
    positions.push({ id, x: pos.x, y: pos.y })
  })

  return positions
}

/**
 * Apply layout to persons
 */
export function applyLayout(
  persons: Person[],
  relations: Relation[],
  layoutType: 'vertical' | 'horizontal' | 'radial' | 'compact' | 'force'
): LayoutPosition[] {
  switch (layoutType) {
    case 'vertical':
      return verticalTreeLayout(persons, relations)
    case 'horizontal':
      return horizontalTreeLayout(persons, relations)
    case 'radial':
      return radialTreeLayout(persons, relations)
    case 'compact':
      return compactGridLayout(persons, relations)
    case 'force':
      return forceDirectedLayout(persons, relations)
    default:
      return verticalTreeLayout(persons, relations)
  }
}
