import { prisma } from './db'
import { sendTelegramMessage } from './telegram'
import { Card, Column, Priority } from '@prisma/client'

interface CardWithRelations extends Card {
  column: Column
  priority: Priority
}

export async function sendNotification(
  card: CardWithRelations,
  action: string,
  oldColumn?: Column,
  oldPriority?: Priority
): Promise<void> {
  try {
    // Проверяем, включены ли уведомления
    const notificationsEnabled = await prisma.systemSettings.findUnique({
      where: { key: 'telegramNotificationsEnabled' },
    })

    if (notificationsEnabled?.value !== 'true') {
      return
    }

    // Получаем chat ID
    const chatIdSetting = await prisma.systemSettings.findUnique({
      where: { key: 'telegramChatId' },
    })

    if (!chatIdSetting?.value) {
      return
    }

    let message = `<b>${action}</b>\n\n`
    message += `<b>Карточка:</b> ${card.organization}\n`
    message += `<b>Текущая колонка:</b> ${card.column.name}\n`
    message += `<b>Приоритет:</b> ${card.priority.name}\n`

    if (oldColumn && oldColumn.id !== card.column.id) {
      message += `<b>Предыдущая колонка:</b> ${oldColumn.name}\n`
    }

    if (oldPriority && oldPriority.id !== card.priority.id) {
      message += `<b>Предыдущий приоритет:</b> ${oldPriority.name}\n`
    }

    message += `\n<b>Организация:</b> ${card.organization}\n`
    message += `<b>Адрес:</b> ${card.deliveryAddress}\n`
    message += `<b>Контакты:</b> ${card.contacts}`

    await sendTelegramMessage(chatIdSetting.value, message)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

export async function logCardHistory(
  cardId: string,
  userId: string | null,
  action: string,
  oldColumnId?: string | null,
  newColumnId?: string | null,
  oldPriorityId?: string | null,
  newPriorityId?: string | null
): Promise<void> {
  try {
    await prisma.cardHistory.create({
      data: {
        cardId,
        userId: userId || undefined,
        action,
        oldColumnId: oldColumnId || undefined,
        newColumnId: newColumnId || undefined,
        oldPriorityId: oldPriorityId || undefined,
        newPriorityId: newPriorityId || undefined,
      },
    })
  } catch (error) {
    console.error('Error logging card history:', error)
  }
}

