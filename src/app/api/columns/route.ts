import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiCache } from '@/lib/api-cache'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheKey = 'columns'

    // Проверяем кэш
    const cachedData = apiCache.get<any[]>(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-From-Cache': 'true',
        },
      })
    }

    const columns = await prisma.column.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    })

    // Сохраняем в кэш
    apiCache.set(cacheKey, columns)

    return NextResponse.json(columns, {
      headers: {
        'X-From-Cache': 'false',
      },
    })
  } catch (error) {
    console.error('Error fetching columns:', error)
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
    const { name, order, isVisible, yellowLimit, redLimit } = body

    // Получаем максимальный order
    const maxOrder = await prisma.column.aggregate({
      _max: { order: true },
    })

    const column = await prisma.column.create({
      data: {
        name,
        order: order ?? (maxOrder._max.order ?? 0) + 1,
        isVisible: isVisible ?? true,
        yellowLimit: yellowLimit ?? null,
        redLimit: redLimit ?? null,
      },
    })

    // Очищаем кэш колонок
    apiCache.clear('columns')

    return NextResponse.json(column)
  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

