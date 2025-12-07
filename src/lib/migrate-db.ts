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
        
        console.log('✅ Card migration completed successfully')
      } else {
        // Другая ошибка - возможно, таблица не существует или другая проблема
        console.warn('Unexpected error checking schema:', error.message)
      }
    }

    // Проверяем наличие таблиц DocumentTemplate и GeneratedDocument
    try {
      await prisma.$queryRaw`SELECT id FROM "DocumentTemplate" LIMIT 1`
      console.log('DocumentTemplate table exists')
    } catch (error: any) {
      if (error.code === 'P2022' || error.message?.includes('does not exist')) {
        console.log('Applying migration: creating DocumentTemplate and GeneratedDocument tables...')
        
        // Создаем таблицу DocumentTemplate
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "DocumentTemplate" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "fileName" TEXT NOT NULL,
            "filePath" TEXT NOT NULL,
            "fields" TEXT NOT NULL,
            "createdBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
          );
        `

        // Создаем таблицу GeneratedDocument
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
            "id" TEXT NOT NULL,
            "templateId" TEXT NOT NULL,
            "cardId" TEXT,
            "fileName" TEXT NOT NULL,
            "filePath" TEXT NOT NULL,
            "data" TEXT NOT NULL,
            "createdBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
          );
        `

        // Создаем индексы и внешние ключи
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "DocumentTemplate_createdBy_idx" ON "DocumentTemplate"("createdBy");
          CREATE INDEX IF NOT EXISTS "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");
          CREATE INDEX IF NOT EXISTS "GeneratedDocument_cardId_idx" ON "GeneratedDocument"("cardId");
          CREATE INDEX IF NOT EXISTS "GeneratedDocument_createdBy_idx" ON "GeneratedDocument"("createdBy");
        `

        // Добавляем внешние ключи (если они еще не существуют)
        try {
          await prisma.$executeRaw`
            ALTER TABLE "DocumentTemplate" 
            ADD CONSTRAINT "DocumentTemplate_createdBy_fkey" 
            FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          `
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            console.warn('Error adding DocumentTemplate foreign key:', e.message)
          }
        }

        try {
          await prisma.$executeRaw`
            ALTER TABLE "GeneratedDocument" 
            ADD CONSTRAINT "GeneratedDocument_templateId_fkey" 
            FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          `
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            console.warn('Error adding GeneratedDocument templateId foreign key:', e.message)
          }
        }

        try {
          await prisma.$executeRaw`
            ALTER TABLE "GeneratedDocument" 
            ADD CONSTRAINT "GeneratedDocument_cardId_fkey" 
            FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          `
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            console.warn('Error adding GeneratedDocument cardId foreign key:', e.message)
          }
        }

        try {
          await prisma.$executeRaw`
            ALTER TABLE "GeneratedDocument" 
            ADD CONSTRAINT "GeneratedDocument_createdBy_fkey" 
            FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          `
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            console.warn('Error adding GeneratedDocument createdBy foreign key:', e.message)
          }
        }

        console.log('✅ Document tables migration completed successfully')
      } else {
        console.warn('Unexpected error checking DocumentTemplate table:', error.message)
      }
    }

    // Проверяем GeneratedDocument
    try {
      await prisma.$queryRaw`SELECT id FROM "GeneratedDocument" LIMIT 1`
      console.log('GeneratedDocument table exists')
    } catch (error: any) {
      // Таблица уже создана выше или будет создана позже
      if (error.code !== 'P2022') {
        console.warn('Unexpected error checking GeneratedDocument table:', error.message)
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error)
    // Не бросаем ошибку, чтобы приложение могло запуститься
    // Миграции могут быть уже применены или будут применены вручную
  }
}

