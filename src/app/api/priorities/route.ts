import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const priorities = await prisma.priority.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(priorities)
  } catch (error) {
    console.error('Error fetching priorities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, color, order } = body

    // Получаем максимальный order
    const maxOrder = await prisma.priority.aggregate({
      _max: { order: true },
    })

    const priority = await prisma.priority.create({
      data: {
        name,
        color,
        order: order ?? (maxOrder._max.order ?? 0) + 1,
      },
    })

    return NextResponse.json(priority)
  } catch (error) {
    console.error('Error creating priority:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

