/**
 * Система отчетов о проделанной работе по колонкам
 */
import { prisma } from './db'
import { sendTelegramMessage } from './telegram'
import dayjs from './dayjs-config'

interface ColumnStats {
  columnId: string
  columnName: string
  remaining: number // Осталось карточек
  moved: number // Перемещено карточек за период
}

/**
 * Получает статистику по колонкам за указанный период
 */
export async function getColumnStats(
  startDate: Date,
  endDate: Date
): Promise<ColumnStats[]> {
  // Получаем все колонки
  const columns = await prisma.column.findMany({
    orderBy: { order: 'asc' },
  })

  const stats: ColumnStats[] = []

  for (const column of columns) {
    // Количество карточек, оставшихся в колонке
    // Используем type assertion, так как TypeScript может не видеть поле isClosed
    const remaining = await prisma.card.count({
      where: {
        columnId: column.id,
        isClosed: false,
      } as any,
    })

    // Количество карточек, перемещенных в эту колонку за период
    const moved = await prisma.cardHistory.count({
      where: {
        newColumnId: column.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        action: 'Перемещена карточка',
      },
    })

    stats.push({
      columnId: column.id,
      columnName: column.name,
      remaining,
      moved,
    })
  }

  return stats
}

/**
 * Форматирует период времени в русском формате
 */
function formatPeriod(startDate: Date, endDate: Date): string {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  const diffMinutes = end.diff(start, 'minute')
  const diffHours = end.diff(start, 'hour')
  const diffDays = end.diff(start, 'day')

  if (diffDays >= 7) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} ${weeks === 1 ? 'неделя' : weeks < 5 ? 'недели' : 'недель'}`
  } else if (diffDays >= 1) {
    return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`
  } else if (diffHours >= 1) {
    return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`
  } else {
    return `${diffMinutes} ${diffMinutes === 1 ? 'минута' : diffMinutes < 5 ? 'минуты' : 'минут'}`
  }
}

/**
 * Формирует и отправляет отчет в Telegram
 */
export async function sendReport(
  chatId: string | number,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  try {
    const stats = await getColumnStats(startDate, endDate)
    const period = formatPeriod(startDate, endDate)

    let message = `📊 <b>Отчет о проделанной работе за период ${period}</b>\n\n`

    for (const stat of stats) {
      message += `"<b>${stat.columnName}</b>"\n`
      message += `Осталось: ${stat.remaining}\n`
      message += `Выполнено: ${stat.moved}\n\n`
    }

    return await sendTelegramMessage(chatId, message)
  } catch (error) {
    console.error('Error sending report:', error)
    return false
  }
}

