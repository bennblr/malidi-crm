import { Priority, Column, Card } from '@prisma/client'

export interface CardWithRelations extends Card {
  priority: Priority
  column: Column
}

/**
 * Рассчитывает приоритет карточки на основе времени нахождения в колонке
 */
export function calculateCardPriority(
  card: CardWithRelations,
  priorities: Priority[]
): Priority {
  const now = new Date()
  const timeInColumn = now.getTime() - card.updatedAt.getTime()
  const timeInDays = timeInColumn / (1000 * 60 * 60 * 24) // конвертируем в дни

  // Сортируем приоритеты по order
  const sortedPriorities = [...priorities].sort((a, b) => a.order - b.order)
  const normalPriority = sortedPriorities[0] // первый (зеленый)
  const warnPriority = sortedPriorities[1] || sortedPriorities[0] // второй (желтый)
  const critPriority = sortedPriorities[2] || sortedPriorities[sortedPriorities.length - 1] // третий (красный)

  // Если установлен красный лимит и прошло больше - красный
  if (card.column.redLimit && timeInDays >= card.column.redLimit) {
    return critPriority
  }

  // Если установлен желтый лимит и прошло больше - желтый
  if (card.column.yellowLimit && timeInDays >= card.column.yellowLimit) {
    return warnPriority
  }

  // Иначе - зеленый
  return normalPriority
}

/**
 * Проверяет, истек ли срок исполнения заявки
 */
export function isExecutionDeadlineExpired(card: CardWithRelations): boolean {
  if (!card.executionDeadline) {
    return false
  }

  const now = new Date()
  return now > card.executionDeadline
}

