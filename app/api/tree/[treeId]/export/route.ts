import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this tree
    const { data: membership } = await supabase
      .from('tree_members')
      .select('role')
      .eq('tree_id', treeId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch all tree data
    const [treeResult, personsResult, relationsResult, contactsResult, sectionsResult] =
      await Promise.all([
        // Tree info
        supabase.from('trees').select('*').eq('id', treeId).single(),

        // Persons
        supabase.from('persons').select('*').eq('tree_id', treeId),

        // Relations
        supabase.from('relations').select('*').eq('tree_id', treeId),

        // Person contacts
        supabase
          .from('person_contacts')
          .select('*, persons!inner(tree_id)')
          .eq('persons.tree_id', treeId),

        // Custom sections
        supabase
          .from('custom_sections')
          .select('*, persons!inner(tree_id)')
          .eq('persons.tree_id', treeId),
      ])

    if (treeResult.error) throw treeResult.error

    // Build export data
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      tree: treeResult.data,
      persons: personsResult.data || [],
      relations: relationsResult.data || [],
      contacts: contactsResult.data || [],
      customSections: sectionsResult.data || [],
    }

    // Create filename
    const timestamp = new Date().toISOString().split('T')[0]
    const treeName = treeResult.data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `family_tree_${treeName}_${timestamp}.json`

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export tree' },
      { status: 500 }
    )
  }
}
