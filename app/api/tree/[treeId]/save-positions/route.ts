import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ treeId: string }> }
) {
  try {
    const { treeId } = await params
    const body = await request.json()
    const { positions } = body as { positions: Array<{ id: string; x: number; y: number }> }

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json({ error: 'Invalid positions data' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has edit access to this tree
    const { data: membership } = await supabase
      .from('tree_members')
      .select('role')
      .eq('tree_id', treeId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update positions for all persons in batch
    const updates = positions.map((pos) =>
      supabase
        .from('persons')
        .update({
          position_x: pos.x,
          position_y: pos.y,
        })
        .eq('id', pos.id)
        .eq('tree_id', treeId) // Security: ensure person belongs to this tree
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save positions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save positions' },
      { status: 500 }
    )
  }
}
