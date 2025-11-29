import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Создание дефолтных приоритетов
  const priorities = [
    { name: 'normal', color: '#52c41a', order: 1 }, // зеленый
    { name: 'warn', color: '#faad14', order: 2 },   // желтый
    { name: 'crit', color: '#ff4d4f', order: 3 },    // красный
  ]

  for (const priority of priorities) {
    await prisma.priority.upsert({
      where: { name: priority.name },
      update: {},
      create: priority,
    })
  }

  // Создание дефолтных колонок
  const columns = [
    { name: 'Заявка принята', order: 1, isVisible: true, yellowLimit: 1, redLimit: 3 },
    { name: 'В пути в СЦ', order: 2, isVisible: true, yellowLimit: 2, redLimit: 5 },
    { name: 'Принят в СЦ', order: 3, isVisible: true, yellowLimit: 1, redLimit: 3 },
    { name: 'Ожидает ТО', order: 4, isVisible: true, yellowLimit: 2, redLimit: 5 },
    { name: 'На ТО', order: 5, isVisible: true, yellowLimit: 3, redLimit: 7 },
    { name: 'Ожидает ЦСМС', order: 6, isVisible: true, yellowLimit: 2, redLimit: 5 },
    { name: 'В ЦСМС', order: 7, isVisible: true, yellowLimit: 3, redLimit: 7 },
    { name: 'После ЦСМС', order: 8, isVisible: true, yellowLimit: 1, redLimit: 3 },
    { name: 'Ожидает отправки', order: 9, isVisible: true, yellowLimit: 2, redLimit: 5 },
    { name: 'Отправлен клиенту', order: 10, isVisible: true, yellowLimit: null, redLimit: null },
    { name: 'Ожидает оплату', order: 11, isVisible: true, yellowLimit: 5, redLimit: 10 },
  ]

  for (const column of columns) {
    await prisma.column.upsert({
      where: { name: column.name },
      update: {},
      create: column as any,
    })
  }

  // Создание системного пользователя для Telegram бота
  const systemPassword = await bcrypt.hash('system', 10)
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@telegram.bot' },
    update: {},
    create: {
      email: 'system@telegram.bot',
      password: systemPassword,
      role: 'EDITOR',
    },
  })

  // Создание админ пользователя (пароль: admin123)
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Создание дефолтных настроек
  const settings = [
    { key: 'executionDeadlineDefault', value: '7' }, // 7 дней по умолчанию
    { key: 'telegramNotificationsEnabled', value: 'true' },
    { key: 'telegramChatId', value: '' },
    { key: 'responsibleUserIds', value: '[]' }, // JSON массив ID ответственных пользователей Telegram
    { key: 'reportIntervalHour', value: '60' }, // 1 час (60 минут)
    { key: 'reportIntervalDay', value: '1440' }, // 1 сутки (1440 минут)
    { key: 'reportIntervalWeek', value: '10080' }, // 1 неделя (10080 минут)
  ]

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

