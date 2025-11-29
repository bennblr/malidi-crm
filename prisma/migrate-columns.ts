import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Получаем все колонки
  const columns = await prisma.column.findMany()

  for (const column of columns) {
    // Конвертируем timeLimit из минут в дни
    // Если timeLimit был 1440 минут (24 часа), то это 1 день
    // Если был 0, то лимиты остаются null
    const timeLimitInDays = column.timeLimit ? Math.ceil(column.timeLimit / (60 * 24)) : null
    
    // Устанавливаем желтый лимит как половину от общего лимита
    // и красный как полный лимит
    const yellowLimit = timeLimitInDays ? Math.ceil(timeLimitInDays / 2) : null
    const redLimit = timeLimitInDays

    await prisma.column.update({
      where: { id: column.id },
      data: {
        yellowLimit,
        redLimit,
      },
    })

    console.log(`Updated column ${column.name}: yellowLimit=${yellowLimit}, redLimit=${redLimit}`)
  }

  console.log('Migration completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

