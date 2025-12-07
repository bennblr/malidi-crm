import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateCardPriority } from '@/utils/priority'
import { sendNotification, logCardHistory } from '@/lib/notifications'
import { initializeWebhook } from '@/lib/webhook-init'
import { initializeSchedules, startScheduler } from '@/lib/report-scheduler'
import { runMigrations } from '@/lib/migrate-db'
import dayjs from '@/lib/dayjs-config'

// Инициализируем миграции, webhook и планировщик отчетов при первом запросе к API
// Используем глобальную переменную для предотвращения повторной инициализации
declare global {
  var __migrationsRun: boolean | undefined
  var __webhookInitialized: boolean | undefined
  var __schedulerStarted: boolean | undefined
}

if (typeof window === 'undefined' && !global.__migrationsRun) {
  global.__migrationsRun = true
  runMigrations()
    .then(() => {
      if (!global.__webhookInitialized) {
        global.__webhookInitialized = true
        return initializeWebhook()
      }
    })
    .then(() => {
      if (!global.__schedulerStarted) {
        global.__schedulerStarted = true
        return initializeSchedules()
      }
    })
    .then(() => {
      if (global.__schedulerStarted) {
        startScheduler()
      }
    })
    .catch(console.error)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isClosedParam = searchParams.get('isClosed')
    
    // Убрали кэширование карточек - всегда возвращаем свежие данные из БД

    // Используем any для where, так как TypeScript может не видеть поле isClosed
    // в типе CardWhereInput до генерации Prisma клиента
    const where: any = {}
    if (isClosedParam !== null) {
      where.isClosed = isClosedParam === 'true'
    } else {
      // По умолчанию показываем только незакрытые карточки
      where.isClosed = false
    }

    const cards = await prisma.card.findMany({
      where,
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
    // Обновляем приоритеты только для незакрытых карточек
    const cardsWithUpdatedPriorities = await Promise.all(
      cards.map(async (card) => {
        // Для закрытых карточек не пересчитываем приоритет
        // TypeScript может не видеть поля Card при использовании include
        if ('isClosed' in card && card.isClosed) {
          return card
        }
        
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

    // Убрали кэширование - всегда возвращаем свежие данные
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

    // Кэш убран, данные всегда свежие

    return NextResponse.json(card)
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

