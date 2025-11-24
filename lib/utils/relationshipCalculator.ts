/**
 * Calculate the relationship between two people in a family tree
 * Returns a human-readable relationship string in Russian
 */

interface Person {
  id: string
  first_name: string
  last_name: string | null
  middle_name: string | null
}

interface Relation {
  id: string
  person1_id: string
  person2_id: string
  relation_type: 'parent_child' | 'spouse'
  person1?: Person
  person2?: Person
}

interface PathNode {
  personId: string
  distance: number
  parent: PathNode | null
  relationType: 'parent' | 'child' | 'spouse' | null
}

/**
 * Build adjacency list from relations
 */
function buildGraph(relations: Relation[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  relations.forEach((rel) => {
    // Add person1 -> person2
    if (!graph.has(rel.person1_id)) {
      graph.set(rel.person1_id, new Set())
    }
    graph.get(rel.person1_id)!.add(rel.person2_id)

    // Add person2 -> person1 (bidirectional)
    if (!graph.has(rel.person2_id)) {
      graph.set(rel.person2_id, new Set())
    }
    graph.get(rel.person2_id)!.add(rel.person1_id)
  })

  return graph
}

/**
 * Find shortest path between two people using BFS
 */
function findPath(
  startId: string,
  endId: string,
  graph: Map<string, Set<string>>
): string[] | null {
  if (startId === endId) return [startId]

  const queue: PathNode[] = [{ personId: startId, distance: 0, parent: null, relationType: null }]
  const visited = new Set<string>([startId])

  while (queue.length > 0) {
    const current = queue.shift()!

    const neighbors = graph.get(current.personId) || new Set()
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue

      visited.add(neighborId)
      const node: PathNode = {
        personId: neighborId,
        distance: current.distance + 1,
        parent: current,
        relationType: null,
      }

      if (neighborId === endId) {
        // Reconstruct path
        const path: string[] = []
        let curr: PathNode | null = node
        while (curr) {
          path.unshift(curr.personId)
          curr = curr.parent
        }
        return path
      }

      queue.push(node)
    }
  }

  return null
}

/**
 * Determine relationship type between adjacent people in path
 */
function getRelationTypeInPath(
  person1Id: string,
  person2Id: string,
  relations: Relation[]
): 'parent' | 'child' | 'spouse' {
  const rel = relations.find(
    (r) =>
      (r.person1_id === person1Id && r.person2_id === person2Id) ||
      (r.person1_id === person2Id && r.person2_id === person1Id)
  )

  if (!rel) return 'spouse'

  if (rel.relation_type === 'spouse') return 'spouse'

  // For parent_child: person1 is parent, person2 is child
  if (rel.relation_type === 'parent_child') {
    if (rel.person1_id === person1Id) return 'child' // person1 has child person2
    return 'parent' // person1 is child of person2
  }

  return 'spouse'
}

/**
 * Calculate relationship name based on path
 */
export function calculateRelationship(
  person1Id: string,
  person2Id: string,
  relations: Relation[]
): string {
  if (person1Id === person2Id) return 'это вы'

  const graph = buildGraph(relations)
  const path = findPath(person1Id, person2Id, graph)

  if (!path || path.length < 2) return 'нет связи'

  // Build relationship path
  const relationPath: string[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const relType = getRelationTypeInPath(path[i], path[i + 1], relations)
    relationPath.push(relType)
  }

  // Direct relationships
  if (path.length === 2) {
    const relType = relationPath[0]
    if (relType === 'parent') return 'родитель'
    if (relType === 'child') return 'ребёнок'
    if (relType === 'spouse') return 'супруг(а)'
  }

  // Siblings (same parents)
  if (path.length === 3 && relationPath[0] === 'parent' && relationPath[1] === 'child') {
    return 'брат/сестра'
  }

  // Grandparents/Grandchildren
  if (path.length === 3 && relationPath[0] === 'parent' && relationPath[1] === 'parent') {
    return 'дедушка/бабушка'
  }
  if (path.length === 3 && relationPath[0] === 'child' && relationPath[1] === 'child') {
    return 'внук/внучка'
  }

  // Aunt/Uncle/Nephew/Niece
  if (
    path.length === 4 &&
    relationPath[0] === 'parent' &&
    relationPath[1] === 'parent' &&
    relationPath[2] === 'child'
  ) {
    return 'дядя/тётя'
  }
  if (
    path.length === 4 &&
    relationPath[0] === 'child' &&
    relationPath[1] === 'parent' &&
    relationPath[2] === 'child'
  ) {
    return 'племянник/племянница'
  }

  // Cousins
  if (
    path.length === 5 &&
    relationPath[0] === 'parent' &&
    relationPath[1] === 'parent' &&
    relationPath[2] === 'child' &&
    relationPath[3] === 'child'
  ) {
    return 'двоюродный брат/сестра'
  }

  // Great-grandparents/Great-grandchildren
  if (path.length === 4 && relationPath.every((r) => r === 'parent')) {
    return 'прадедушка/прабабушка'
  }
  if (path.length === 4 && relationPath.every((r) => r === 'child')) {
    return 'правнук/правнучка'
  }

  // Count generations up and down for complex relationships
  let upGenerations = 0
  let downGenerations = 0
  let inSpouseLine = false

  for (const relType of relationPath) {
    if (relType === 'parent') upGenerations++
    else if (relType === 'child') downGenerations++
    else if (relType === 'spouse') inSpouseLine = true
  }

  // If it involves spouse, it's an in-law relationship
  if (inSpouseLine) {
    if (path.length === 3) return 'свёкр/свекровь/тесть/тёща'
    return `родственник${path.length > 4 ? ' дальний' : ''}`
  }

  // Distant cousins
  if (upGenerations === downGenerations && upGenerations > 2) {
    const degree = upGenerations - 1
    if (degree === 2) return 'двоюродный брат/сестра'
    if (degree === 3) return 'троюродный брат/сестра'
    if (degree === 4) return 'четвероюродный брат/сестра'
    return `${degree}-юродный брат/сестра`
  }

  // Default for complex relationships
  const totalDistance = path.length - 1
  if (totalDistance <= 3) return 'близкий родственник'
  if (totalDistance <= 5) return 'родственник'
  return 'дальний родственник'
}

/**
 * Get detailed relationship explanation
 */
export function getRelationshipExplanation(
  person1Id: string,
  person2Id: string,
  relations: Relation[]
): string {
  const graph = buildGraph(relations)
  const path = findPath(person1Id, person2Id, graph)

  if (!path || path.length < 2) {
    return 'Нет найденной связи в семейном дереве'
  }

  const steps = []
  for (let i = 0; i < path.length - 1; i++) {
    const relType = getRelationTypeInPath(path[i], path[i + 1], relations)
    if (relType === 'parent') steps.push('↑ родитель')
    else if (relType === 'child') steps.push('↓ ребёнок')
    else if (relType === 'spouse') steps.push('💑 супруг(а)')
  }

  return `Путь через ${path.length - 1} ${path.length - 1 === 1 ? 'связь' : 'связи'}: ${steps.join(' → ')}`
}
