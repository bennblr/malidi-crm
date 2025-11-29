/**
 * Система расписания для автоматической отправки отчетов
 */
import { prisma } from './db'
import { sendReport } from './reports'
import dayjs from './dayjs-config'

interface ReportSchedule {
  id: string
  chatId: string | number
  intervalMinutes: number
  lastSent?: Date
}

// Хранилище расписаний (в продакшене лучше использовать БД или Redis)
const schedules: Map<string, ReportSchedule> = new Map()

/**
 * Инициализирует расписания из настроек системы
 */
export async function initializeSchedules() {
  try {
    // Получаем настройки интервалов отчетов
    const hourInterval = await prisma.systemSettings.findUnique({
      where: { key: 'reportIntervalHour' },
    })
    const dayInterval = await prisma.systemSettings.findUnique({
      where: { key: 'reportIntervalDay' },
    })
    const weekInterval = await prisma.systemSettings.findUnique({
      where: { key: 'reportIntervalWeek' },
    })

    // Получаем chat ID для отправки отчетов
    const chatIdSetting = await prisma.systemSettings.findUnique({
      where: { key: 'telegramChatId' },
    })

    if (!chatIdSetting?.value) {
      console.log('Telegram chat ID не настроен, отчеты не будут отправляться')
      return
    }

    const chatId = chatIdSetting.value

    // Добавляем расписания по умолчанию, если они не настроены
    const defaultIntervals = [
      { key: 'hour', minutes: 60 }, // 1 час
      { key: 'day', minutes: 1440 }, // 1 сутки
      { key: 'week', minutes: 10080 }, // 1 неделя
    ]

    for (const interval of defaultIntervals) {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: `reportInterval${interval.key.charAt(0).toUpperCase() + interval.key.slice(1)}` },
      })

      const intervalMinutes = setting
        ? parseInt(setting.value) || interval.minutes
        : interval.minutes

      schedules.set(`report_${interval.key}`, {
        id: `report_${interval.key}`,
        chatId,
        intervalMinutes,
      })
    }

    console.log(`Инициализировано ${schedules.size} расписаний отчетов`)
  } catch (error) {
    console.error('Error initializing report schedules:', error)
  }
}

/**
 * Проверяет и отправляет отчеты по расписанию
 */
export async function checkAndSendReports() {
  const now = new Date()

  for (const [id, schedule] of schedules.entries()) {
    const shouldSend =
      !schedule.lastSent ||
      dayjs(now).diff(dayjs(schedule.lastSent), 'minute') >= schedule.intervalMinutes

    if (shouldSend) {
      try {
        const startDate = schedule.lastSent
          ? dayjs(schedule.lastSent).toDate()
          : dayjs().subtract(schedule.intervalMinutes, 'minute').toDate()
        const endDate = now

        const success = await sendReport(schedule.chatId, startDate, endDate)

        if (success) {
          schedule.lastSent = endDate
          console.log(`Отчет ${id} успешно отправлен`)
        } else {
          console.error(`Ошибка при отправке отчета ${id}`)
        }
      } catch (error) {
        console.error(`Ошибка при отправке отчета ${id}:`, error)
      }
    }
  }
}

/**
 * Запускает проверку расписаний каждую минуту
 */
export function startScheduler() {
  // Проверяем каждую минуту
  setInterval(() => {
    checkAndSendReports().catch(console.error)
  }, 60 * 1000) // 1 минута

  // Первая проверка через 1 минуту после запуска
  setTimeout(() => {
    checkAndSendReports().catch(console.error)
  }, 60 * 1000)

  console.log('Планировщик отчетов запущен')
}

