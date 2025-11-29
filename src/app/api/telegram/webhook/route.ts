import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseTelegramMessage } from '@/utils/parser'
import { likeMessage, sendErrorMessageWithTags } from '@/lib/telegram'
import dayjs from 'dayjs'

// Обработка GET запроса для проверки webhook
export async function GET() {
  console.log('=== Telegram webhook GET request (health check) ===')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString(),
    note: 'This endpoint expects POST requests from Telegram. Use /api/telegram/setup to configure webhook.'
  })
}

export async function POST(request: NextRequest) {
  try {
    // Логируем начало обработки запроса
    console.log('=== Telegram webhook POST request received ===')
    console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))
    
    const body = await request.json()
    
    // Логируем входящий запрос для отладки
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2))

    // Обработка сообщений от Telegram
    if (body.message?.text) {
      const messageText = body.message.text
      const chatId = body.message.chat.id
      const messageId = body.message.message_id
      
      console.log('Message text:', messageText)
      
      const parsedData = parseTelegramMessage(messageText)
      console.log('Parsed data:', parsedData)

      if (!parsedData) {
        console.log('Failed to parse message - sending error notification')
        await handleError(chatId, messageId, 'Не удалось распарсить сообщение. Проверьте формат заявки.')
        return NextResponse.json({ success: false, error: 'Failed to parse message' })
      }
      
      // Проверяем, что обязательные поля заполнены
      if (!parsedData.instruments || !parsedData.deliveryAddress || !parsedData.contacts || !parsedData.organization) {
        console.log('Missing required fields in parsed data')
        await handleError(chatId, messageId, 'В сообщении отсутствуют обязательные поля: Приборы, Адрес доставки, Контакты или Организация.')
        return NextResponse.json({ success: false, error: 'Missing required fields' })
      }

      // Получаем первую колонку (Новые заявки)
      const firstColumn = await prisma.column.findFirst({
        orderBy: { order: 'asc' },
      })

      if (!firstColumn) {
        await handleError(chatId, messageId, 'В системе не найдено ни одной колонки. Обратитесь к администратору.')
        return NextResponse.json({ success: false, error: 'No columns found' })
      }

      // Получаем дефолтный приоритет (зеленый)
      const defaultPriority = await prisma.priority.findFirst({
        orderBy: { order: 'asc' },
      })

      if (!defaultPriority) {
        await handleError(chatId, messageId, 'В системе не найдено ни одного приоритета. Обратитесь к администратору.')
        return NextResponse.json({ success: false, error: 'No priorities found' })
      }

      // Получаем системного пользователя
      const systemUser = await prisma.user.findUnique({
        where: { email: 'system@telegram.bot' },
      })

      if (!systemUser) {
        await handleError(chatId, messageId, 'Системный пользователь не найден. Обратитесь к администратору.')
        return NextResponse.json({ success: false, error: 'System user not found' })
      }

      // Получаем дефолтный срок исполнения
      const executionDeadlineSetting = await prisma.systemSettings.findUnique({
        where: { key: 'executionDeadlineDefault' },
      })

      const executionDeadlineDays = executionDeadlineSetting
        ? parseInt(executionDeadlineSetting.value)
        : 7

      const executionDeadline = dayjs().add(executionDeadlineDays, 'day').toDate()

      // Парсим дату отправки
      let shippingDate: Date | null = null
      if (parsedData.shippingDate) {
        shippingDate = dayjs(parsedData.shippingDate).toDate()
      }

      // Создаем карточку
      const card = await prisma.card.create({
        data: {
          instruments: parsedData.instruments,
          deliveryAddress: parsedData.deliveryAddress,
          contacts: parsedData.contacts,
          organization: parsedData.organization,
          shippingDate,
          notes: parsedData.notes,
          postalOrder: parsedData.postalOrder,
          priorityId: defaultPriority.id,
          columnId: firstColumn.id,
          userId: systemUser.id,
          executionDeadline,
        },
      })

      console.log('Card created successfully:', card.id)
      
      // Ставим лайк на сообщение
      await likeMessage(chatId, messageId)
      
      return NextResponse.json({ success: true, cardId: card.id })
    }

    console.log('No message text found in body')
    console.log('Body keys:', Object.keys(body))
    return NextResponse.json({ success: false, error: 'Invalid message format' })
  } catch (error) {
    console.error('=== Error processing Telegram webhook ===')
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Вспомогательная функция для обработки ошибок
async function handleError(chatId: string | number, messageId: number, errorMessage: string) {
  try {
    // Получаем список ответственных пользователей
    const responsibleSetting = await prisma.systemSettings.findUnique({
      where: { key: 'responsibleUserIds' },
    })
    
    let responsibleUserIds: number[] = []
    if (responsibleSetting?.value) {
      try {
        responsibleUserIds = JSON.parse(responsibleSetting.value)
      } catch (e) {
        console.error('Error parsing responsibleUserIds:', e)
      }
    }
    
    // Отправляем сообщение об ошибке с тегами
    await sendErrorMessageWithTags(chatId, messageId, errorMessage, responsibleUserIds)
  } catch (error) {
    console.error('Error handling error notification:', error)
  }
}

