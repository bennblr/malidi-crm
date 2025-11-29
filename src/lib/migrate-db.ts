import { prisma } from './db'

/**
 * Применяет миграции базы данных программно
 * Проверяет наличие необходимых колонок и добавляет их, если отсутствуют
 * Вызывается при старте приложения
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Checking database schema and applying migrations if needed...')
    
    // Проверяем наличие колонки isClosed через попытку запроса
    // Если колонка не существует, Prisma выбросит ошибку, которую мы обработаем
    try {
      // Пробуем выполнить простой запрос, который использует isClosed
      await prisma.$queryRaw`SELECT "isClosed" FROM "Card" LIMIT 1`
      console.log('Database schema is up to date (isClosed column exists)')
      return
    } catch (error: any) {
      // Если колонка не существует, применяем миграцию
      if (error.code === 'P2022' || error.message?.includes('does not exist')) {
        console.log('Applying migration: adding isClosed, closedAt, closedComment, closedBy columns...')
        
        // Применяем миграцию через прямой SQL
        await prisma.$executeRaw`
          ALTER TABLE "Card" 
          ADD COLUMN IF NOT EXISTS "isClosed" BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
          ADD COLUMN IF NOT EXISTS "closedComment" TEXT,
          ADD COLUMN IF NOT EXISTS "closedBy" TEXT;
        `
        
        console.log('✅ Database migration completed successfully')
      } else {
        // Другая ошибка - возможно, таблица не существует или другая проблема
        console.warn('Unexpected error checking schema:', error.message)
        throw error
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error)
    // Не бросаем ошибку, чтобы приложение могло запуститься
    // Миграции могут быть уже применены или будут применены вручную
  }
}

