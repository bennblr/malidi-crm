import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateCardPriority } from '@/utils/priority'
import { sendNotification, logCardHistory } from '@/lib/notifications'
import dayjs from 'dayjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cards = await prisma.card.findMany({
      include: {
        priority: true,
        column: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Получаем все приоритеты для расчета
    const priorities = await prisma.priority.findMany({
      orderBy: { order: 'asc' },
    })

    // Обновляем приоритеты на основе времени в колонке
    const cardsWithUpdatedPriorities = await Promise.all(
      cards.map(async (card) => {
        const calculatedPriority = calculateCardPriority(card, priorities)
        
        // Если приоритет изменился, обновляем в БД
        if (calculatedPriority.id !== card.priorityId) {
          const updatedCard = await prisma.card.update({
            where: { id: card.id },
            data: { priorityId: calculatedPriority.id },
            include: {
              priority: true,
              column: true,
              user: true,
            },
          })
          return updatedCard
        }
        return card
      })
    )

    return NextResponse.json(cardsWithUpdatedPriorities)
  } catch (error) {
    console.error('Error fetching cards:', error)
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

    const body = await request.json()
    const {
      instruments,
      deliveryAddress,
      contacts,
      organization,
      shippingDate,
      notes,
      postalOrder,
      columnId,
      priorityId,
      executionDeadline,
    } = body

    const card = await prisma.card.create({
      data: {
        instruments,
        deliveryAddress,
        contacts,
        organization,
        shippingDate: shippingDate ? dayjs(shippingDate).toDate() : null,
        notes,
        postalOrder,
        columnId,
        priorityId,
        userId: session.user.id,
        executionDeadline: executionDeadline
          ? dayjs(executionDeadline).toDate()
          : null,
      },
      include: {
        priority: true,
        column: true,
        user: true,
      },
    })

    await logCardHistory(card.id, session.user.id, 'Создана карточка')

    return NextResponse.json(card)
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

