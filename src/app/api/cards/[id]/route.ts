import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateCardPriority } from '@/utils/priority'
import { sendNotification, logCardHistory } from '@/lib/notifications'
import dayjs from 'dayjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    return NextResponse.json(card)
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const oldCard = await prisma.card.findUnique({
      where: { id: params.id },
      include: {
        priority: true,
        column: true,
      },
    })

    if (!oldCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (body.instruments !== undefined) updateData.instruments = body.instruments
    if (body.deliveryAddress !== undefined)
      updateData.deliveryAddress = body.deliveryAddress
    if (body.contacts !== undefined) updateData.contacts = body.contacts
    if (body.organization !== undefined)
      updateData.organization = body.organization
    if (body.shippingDate !== undefined)
      updateData.shippingDate = body.shippingDate
        ? dayjs(body.shippingDate).toDate()
        : null
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.postalOrder !== undefined) updateData.postalOrder = body.postalOrder
    if (body.executionDeadline !== undefined)
      updateData.executionDeadline = body.executionDeadline
        ? dayjs(body.executionDeadline).toDate()
        : null

    // Обработка перемещения между колонками
    if (body.columnId && body.columnId !== oldCard.columnId) {
      updateData.columnId = body.columnId
      updateData.updatedAt = new Date() // Сбрасываем время для расчета приоритета
    }

    const card = await prisma.card.update({
      where: { id: params.id },
      data: updateData,
      include: {
        priority: true,
        column: true,
        user: true,
      },
    })

    // Пересчитываем приоритет
    const priorities = await prisma.priority.findMany({
      orderBy: { order: 'asc' },
    })
    const calculatedPriority = calculateCardPriority(card, priorities)

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

      // Логируем изменения
      await logCardHistory(
        card.id,
        session.user.id,
        'Изменен приоритет',
        undefined,
        undefined,
        oldCard.priorityId,
        calculatedPriority.id
      )

      // Отправляем уведомление
      await sendNotification(updatedCard, 'Изменен приоритет', undefined, oldCard.priority)

      return NextResponse.json(updatedCard)
    }

    // Логируем перемещение между колонками
    if (body.columnId && body.columnId !== oldCard.columnId) {
      const newColumn = await prisma.column.findUnique({
        where: { id: body.columnId },
      })

      await logCardHistory(
        card.id,
        session.user.id,
        'Перемещена карточка',
        oldCard.columnId,
        body.columnId
      )

      if (newColumn) {
        await sendNotification(card, 'Перемещена карточка', oldCard.column, undefined)
      }
    } else {
      await logCardHistory(card.id, session.user.id, 'Обновлена карточка')
    }

    return NextResponse.json(card)
  } catch (error) {
    console.error('Error updating card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.card.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

