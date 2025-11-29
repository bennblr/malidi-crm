import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCardHistory } from '@/lib/notifications'
import { apiCache } from '@/lib/api-cache'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const comment = body.comment || ''

    const card = await prisma.card.findUnique({
      where: { id: params.id },
      include: {
        priority: true,
        column: true,
        user: true,
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // TypeScript может не видеть поля Card при использовании include
    // Проверяем через проверку наличия свойства или type assertion
    if ('isClosed' in card && card.isClosed) {
      return NextResponse.json({ error: 'Card already closed' }, { status: 400 })
    }

    // Используем type assertion, так как TypeScript может не видеть поля
    // при использовании include, но мы знаем, что они существуют в схеме
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedComment: comment || null,
        closedBy: session.user.id,
      } as any, // Type assertion для обхода проблемы с типами Prisma
      include: {
        priority: true,
        column: true,
        user: true,
      },
    })

    // Логируем закрытие
    await logCardHistory(
      card.id,
      session.user.id,
      'Закрыта карточка',
      card.columnId,
      undefined
    )

    // Очищаем кэш карточек
    apiCache.clear('cards_false')
    apiCache.clear('cards_true')

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error('Error closing card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

