/**
 * Comprehensive relationship calculator for family trees
 * Uses BFS pathfinding to determine relationships
 */

interface Relation {
  person1_id: string
  person2_id: string
  relation_type: string
}

interface Person {
  id: string
  gender?: string | null
}

type Gender = 'male' | 'female' | null

// Edge types in the family graph
type EdgeType = 'parent' | 'child' | 'spouse' | 'sibling'

interface Edge {
  to: string
  type: EdgeType
}

interface PathStep {
  personId: string
  edge: EdgeType | null  // null for starting person
}

/**
 * Build adjacency list from relations
 */
function buildAdjacencyList(relations: Relation[]): Map<string, Edge[]> {
  const graph = new Map<string, Edge[]>()

  const addEdge = (from: string, to: string, type: EdgeType) => {
    const edges = graph.get(from) || []
    // Avoid duplicates
    if (!edges.some(e => e.to === to && e.type === type)) {
      edges.push({ to, type })
      graph.set(from, edges)
    }
  }

  relations.forEach(rel => {
    if (rel.relation_type === 'parent_child') {
      // person1 is parent, person2 is child
      addEdge(rel.person1_id, rel.person2_id, 'child')
      addEdge(rel.person2_id, rel.person1_id, 'parent')
    } else if (rel.relation_type === 'spouse' || rel.relation_type === 'ex_spouse') {
      addEdge(rel.person1_id, rel.person2_id, 'spouse')
      addEdge(rel.person2_id, rel.person1_id, 'spouse')
    } else if (rel.relation_type === 'sibling') {
      addEdge(rel.person1_id, rel.person2_id, 'sibling')
      addEdge(rel.person2_id, rel.person1_id, 'sibling')
    }
  })

  return graph
}

/**
 * Find shortest path between two people using BFS
 * Returns array of edge types taken
 */
function findPath(
  graph: Map<string, Edge[]>,
  fromId: string,
  toId: string,
  maxDepth: number = 15
): EdgeType[] | null {
  if (fromId === toId) return []

  const visited = new Set<string>()
  const queue: { id: string; path: EdgeType[] }[] = [{ id: fromId, path: [] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!

    if (path.length > maxDepth) continue
    if (visited.has(id)) continue
    visited.add(id)

    const edges = graph.get(id) || []
    for (const edge of edges) {
      const newPath = [...path, edge.type]

      if (edge.to === toId) {
        return newPath
      }

      if (!visited.has(edge.to)) {
        queue.push({ id: edge.to, path: newPath })
      }
    }
  }

  return null
}

/**
 * Simplify path by removing spouse hops where possible
 * and converting to canonical form
 */
function simplifyPath(path: EdgeType[]): EdgeType[] {
  if (path.length === 0) return path

  // Remove leading spouse (treat spouse's family as my family for in-laws)
  let result = [...path]
  let throughSpouse = false

  if (result[0] === 'spouse') {
    throughSpouse = true
    result = result.slice(1)
  }

  // Convert sibling paths through parents
  // sibling -> parent + child (for consistency)
  const normalized: EdgeType[] = []
  for (const edge of result) {
    if (edge === 'sibling') {
      normalized.push('parent', 'child')
    } else {
      normalized.push(edge)
    }
  }

  // Re-add spouse marker if needed
  if (throughSpouse) {
    return ['spouse', ...normalized]
  }

  return normalized
}

/**
 * Count ups and downs in path to determine relationship
 */
function analyzePathGenerations(path: EdgeType[]): {
  ups: number       // generations up (to parents)
  downs: number     // generations down (to children)
  throughSpouse: boolean
  endsWithSpouse: boolean
} {
  let ups = 0
  let downs = 0
  let throughSpouse = path[0] === 'spouse'
  let endsWithSpouse = path[path.length - 1] === 'spouse'

  for (const edge of path) {
    if (edge === 'parent') ups++
    else if (edge === 'child') downs++
  }

  return { ups, downs, throughSpouse, endsWithSpouse }
}

/**
 * Determine relationship type from path analysis
 */
function getRelationshipFromPath(path: EdgeType[]): string {
  if (path.length === 0) return 'self'

  const simplified = simplifyPath(path)
  const { ups, downs, throughSpouse, endsWithSpouse } = analyzePathGenerations(simplified)

  // Direct spouse
  if (path.length === 1 && path[0] === 'spouse') {
    return 'spouse'
  }

  // Ends with spouse = in-law of some kind
  if (endsWithSpouse && path.length > 1) {
    // Remove last spouse to get base relationship
    const basePath = path.slice(0, -1)
    const baseRel = getRelationshipFromPath(basePath)
    return baseRel + '_spouse' // child_spouse = child-in-law, sibling_spouse = sibling-in-law
  }

  // Through spouse = spouse's relative
  if (throughSpouse) {
    const spouseRelPath = simplified.slice(1) // Remove spouse marker
    if (spouseRelPath.length === 0) return 'spouse'

    const { ups: sUps, downs: sDowns } = analyzePathGenerations(spouseRelPath)

    // Spouse's parent = parent-in-law
    if (sUps === 1 && sDowns === 0) return 'parent_in_law'
    // Spouse's grandparent
    if (sUps === 2 && sDowns === 0) return 'grandparent_in_law'
    // Spouse's sibling
    if (sUps === 1 && sDowns === 1) return 'sibling_in_law'
    // Spouse's child (stepchild technically, but usually shown differently)
    if (sUps === 0 && sDowns === 1) return 'step_child'
    // Spouse's uncle/aunt
    if (sUps === 2 && sDowns === 1) return 'spouse_uncle_aunt'
    // Spouse's nephew/niece
    if (sUps === 1 && sDowns === 2) return 'spouse_nephew_niece'
    // Spouse's cousin
    if (sUps === 2 && sDowns === 2) return 'spouse_cousin'
    // Spouse's grandchild
    if (sUps === 0 && sDowns === 2) return 'spouse_grandchild'

    return 'spouse_relative'
  }

  // Direct blood relationships
  // Only ups = ancestor
  if (downs === 0) {
    switch (ups) {
      case 1: return 'parent'
      case 2: return 'grandparent'
      case 3: return 'great_grandparent'
      case 4: return 'great_great_grandparent'
      default: return 'ancestor'
    }
  }

  // Only downs = descendant
  if (ups === 0) {
    switch (downs) {
      case 1: return 'child'
      case 2: return 'grandchild'
      case 3: return 'great_grandchild'
      case 4: return 'great_great_grandchild'
      default: return 'descendant'
    }
  }

  // Collateral relatives (ups > 0 && downs > 0)

  // Sibling: up 1, down 1
  if (ups === 1 && downs === 1) return 'sibling'

  // Uncle/Aunt: up 2, down 1 (parent's sibling)
  if (ups === 2 && downs === 1) return 'uncle_aunt'

  // Nephew/Niece: up 1, down 2 (sibling's child)
  if (ups === 1 && downs === 2) return 'nephew_niece'

  // First cousin (двоюродный): up 2, down 2
  if (ups === 2 && downs === 2) return 'cousin'

  // Great uncle/aunt: up 3, down 1 (grandparent's sibling)
  if (ups === 3 && downs === 1) return 'great_uncle_aunt'

  // Grand nephew/niece: up 1, down 3 (sibling's grandchild)
  if (ups === 1 && downs === 3) return 'grand_nephew_niece'

  // First cousin once removed (up): up 3, down 2 (parent's cousin)
  if (ups === 3 && downs === 2) return 'cousin_once_removed_up'

  // First cousin once removed (down): up 2, down 3 (cousin's child)
  if (ups === 2 && downs === 3) return 'cousin_once_removed_down'

  // Second cousin (троюродный): up 3, down 3
  if (ups === 3 && downs === 3) return 'second_cousin'

  // Great-great uncle/aunt: up 4, down 1
  if (ups === 4 && downs === 1) return 'great_great_uncle_aunt'

  // Great-grand nephew/niece: up 1, down 4
  if (ups === 1 && downs === 4) return 'great_grand_nephew_niece'

  // First cousin twice removed (up): up 4, down 2
  if (ups === 4 && downs === 2) return 'cousin_twice_removed_up'

  // First cousin twice removed (down): up 2, down 4
  if (ups === 2 && downs === 4) return 'cousin_twice_removed_down'

  // Second cousin once removed (up): up 4, down 3
  if (ups === 4 && downs === 3) return 'second_cousin_once_removed_up'

  // Second cousin once removed (down): up 3, down 4
  if (ups === 3 && downs === 4) return 'second_cousin_once_removed_down'

  // Third cousin (четвероюродный): up 4, down 4
  if (ups === 4 && downs === 4) return 'third_cousin'

  // Generic distant relative
  if (ups > 0 && downs > 0) {
    const minGen = Math.min(ups, downs)
    const diff = Math.abs(ups - downs)

    if (minGen >= 2) {
      // Cousin of some degree
      return 'distant_cousin'
    }
  }

  return 'distant_relative'
}

/**
 * Find relationship between two persons
 */
export function findRelationship(
  fromPersonId: string,
  toPersonId: string,
  relations: Relation[],
  persons: Person[]
): { type: string; gender: Gender } {
  if (fromPersonId === toPersonId) {
    return { type: 'self', gender: null }
  }

  const personGenderMap = new Map(persons.map(p => [p.id, p.gender as Gender]))
  const toPersonGender = personGenderMap.get(toPersonId) || null

  const graph = buildAdjacencyList(relations)
  const path = findPath(graph, fromPersonId, toPersonId)

  if (!path) {
    return { type: 'unknown', gender: toPersonGender }
  }

  const type = getRelationshipFromPath(path)

  return { type, gender: toPersonGender }
}

/**
 * Get Russian label for relationship
 */
export function getRelationshipLabel(relationship: { type: string; gender: Gender }): string {
  const { type, gender } = relationship
  const isMale = gender === 'male'
  const isFemale = gender === 'female'

  switch (type) {
    case 'self':
      return 'Это вы'

    // Direct blood
    case 'parent':
      return isMale ? 'Отец' : isFemale ? 'Мать' : 'Родитель'
    case 'child':
      return isMale ? 'Сын' : isFemale ? 'Дочь' : 'Ребёнок'
    case 'sibling':
      return isMale ? 'Брат' : isFemale ? 'Сестра' : 'Брат/Сестра'

    // Grandparents/grandchildren
    case 'grandparent':
      return isMale ? 'Дедушка' : isFemale ? 'Бабушка' : 'Дедушка/Бабушка'
    case 'grandchild':
      return isMale ? 'Внук' : isFemale ? 'Внучка' : 'Внук/Внучка'
    case 'great_grandparent':
      return isMale ? 'Прадедушка' : isFemale ? 'Прабабушка' : 'Прадед/Прабабушка'
    case 'great_grandchild':
      return isMale ? 'Правнук' : isFemale ? 'Правнучка' : 'Правнук/Правнучка'
    case 'great_great_grandparent':
      return isMale ? 'Прапрадедушка' : isFemale ? 'Прапрабабушка' : 'Прапрадед/Прапрабабушка'
    case 'great_great_grandchild':
      return isMale ? 'Праправнук' : isFemale ? 'Праправнучка' : 'Праправнук/Праправнучка'
    case 'ancestor':
      return 'Предок'
    case 'descendant':
      return isMale ? 'Потомок' : isFemale ? 'Потомок' : 'Потомок'

    // Uncles/Aunts and Nephews/Nieces
    case 'uncle_aunt':
      return isMale ? 'Дядя' : isFemale ? 'Тётя' : 'Дядя/Тётя'
    case 'nephew_niece':
      return isMale ? 'Племянник' : isFemale ? 'Племянница' : 'Племянник/Племянница'
    case 'great_uncle_aunt':
      return isMale ? 'Двоюродный дедушка' : isFemale ? 'Двоюродная бабушка' : 'Двоюр. дед/бабушка'
    case 'grand_nephew_niece':
      return isMale ? 'Внучатый племянник' : isFemale ? 'Внучатая племянница' : 'Внучатый племянник'
    case 'great_great_uncle_aunt':
      return isMale ? 'Двоюродный прадедушка' : isFemale ? 'Двоюродная прабабушка' : 'Двоюр. прадед'
    case 'great_grand_nephew_niece':
      return isMale ? 'Правнучатый племянник' : isFemale ? 'Правнучатая племянница' : 'Правнучатый племянник'

    // Cousins
    case 'cousin':
      return isMale ? 'Двоюродный брат' : isFemale ? 'Двоюродная сестра' : 'Двоюродный брат/сестра'
    case 'cousin_once_removed_up':
      return isMale ? 'Двоюродный дядя' : isFemale ? 'Двоюродная тётя' : 'Двоюродный дядя/тётя'
    case 'cousin_once_removed_down':
      return isMale ? 'Двоюродный племянник' : isFemale ? 'Двоюродная племянница' : 'Двоюр. племянник'
    case 'cousin_twice_removed_up':
      return isMale ? 'Двоюродный дед' : isFemale ? 'Двоюродная бабушка' : 'Двоюродный дед/бабушка'
    case 'cousin_twice_removed_down':
      return isMale ? 'Внук двоюр. брата' : isFemale ? 'Внучка двоюр. брата' : 'Внук двоюр. брата/сестры'
    case 'second_cousin':
      return isMale ? 'Троюродный брат' : isFemale ? 'Троюродная сестра' : 'Троюродный брат/сестра'
    case 'second_cousin_once_removed_up':
      return isMale ? 'Троюродный дядя' : isFemale ? 'Троюродная тётя' : 'Троюродный дядя/тётя'
    case 'second_cousin_once_removed_down':
      return isMale ? 'Троюродный племянник' : isFemale ? 'Троюродная племянница' : 'Троюр. племянник'
    case 'third_cousin':
      return isMale ? 'Четвероюродный брат' : isFemale ? 'Четвероюродная сестра' : 'Четвероюр. брат/сестра'
    case 'distant_cousin':
      return 'Дальний кузен'

    // Marriage relations
    case 'spouse':
      return isMale ? 'Муж' : isFemale ? 'Жена' : 'Супруг(а)'

    // In-laws (through spouse)
    case 'parent_in_law':
      return isMale ? 'Свёкор/Тесть' : isFemale ? 'Свекровь/Тёща' : 'Родитель супруга'
    case 'grandparent_in_law':
      return isMale ? 'Дедушка супруга' : isFemale ? 'Бабушка супруга' : 'Дед/бабушка супруга'
    case 'sibling_in_law':
      return isMale ? 'Деверь/Шурин' : isFemale ? 'Золовка/Свояченица' : 'Брат/сестра супруга'
    case 'spouse_uncle_aunt':
      return isMale ? 'Дядя супруга' : isFemale ? 'Тётя супруга' : 'Дядя/тётя супруга'
    case 'spouse_nephew_niece':
      return isMale ? 'Племянник супруга' : isFemale ? 'Племянница супруга' : 'Племянник супруга'
    case 'spouse_cousin':
      return isMale ? 'Двоюр. брат супруга' : isFemale ? 'Двоюр. сестра супруга' : 'Двоюр. брат/сестра супруга'
    case 'spouse_grandchild':
      return isMale ? 'Внук супруга' : isFemale ? 'Внучка супруга' : 'Внук/внучка супруга'
    case 'spouse_relative':
      return 'Родственник супруга'

    // In-laws (spouses of relatives)
    case 'child_spouse':
      return isMale ? 'Зять' : isFemale ? 'Невестка' : 'Зять/Невестка'
    case 'sibling_spouse':
      return isMale ? 'Зять (муж сестры)' : isFemale ? 'Невестка (жена брата)' : 'Супруг брата/сестры'
    case 'grandchild_spouse':
      return isMale ? 'Муж внучки' : isFemale ? 'Жена внука' : 'Супруг внука/внучки'
    case 'nephew_niece_spouse':
      return isMale ? 'Муж племянницы' : isFemale ? 'Жена племянника' : 'Супруг племянника'
    case 'uncle_aunt_spouse':
      return isMale ? 'Муж тёти' : isFemale ? 'Жена дяди' : 'Супруг дяди/тёти'
    case 'cousin_spouse':
      return isMale ? 'Муж двоюр. сестры' : isFemale ? 'Жена двоюр. брата' : 'Супруг двоюр. брата/сестры'
    case 'parent_spouse':
      return isMale ? 'Отчим' : isFemale ? 'Мачеха' : 'Отчим/Мачеха'

    // Step relations
    case 'step_child':
      return isMale ? 'Пасынок' : isFemale ? 'Падчерица' : 'Пасынок/Падчерица'
    case 'step_parent':
      return isMale ? 'Отчим' : isFemale ? 'Мачеха' : 'Отчим/Мачеха'

    // Generic
    case 'distant_relative':
      return 'Дальний родственник'
    case 'unknown':
      return ''  // Don't show anything for unknown
    default:
      // Handle dynamic types like "great_grandchild_spouse"
      if (type.endsWith('_spouse')) {
        return isMale ? 'Муж родственника' : isFemale ? 'Жена родственника' : 'Супруг родственника'
      }
      return 'Родственник'
  }
}

/**
 * Get relationship label between current user and a person
 */
export function getRelationshipToUser(
  linkedPersonId: string | null,
  targetPersonId: string,
  relations: Relation[],
  persons: Person[]
): string | null {
  if (!linkedPersonId) return null
  if (linkedPersonId === targetPersonId) return 'Это вы'

  const relationship = findRelationship(linkedPersonId, targetPersonId, relations, persons)

  if (relationship.type === 'unknown') return null

  return getRelationshipLabel(relationship)
}
