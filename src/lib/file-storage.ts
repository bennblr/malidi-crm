/**
 * Утилиты для работы с файлами на сервере
 */

import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const TEMPLATES_DIR = path.join(UPLOAD_DIR, 'templates')
const DOCUMENTS_DIR = path.join(UPLOAD_DIR, 'documents')

/**
 * Инициализирует директории для хранения файлов
 */
export async function ensureDirectoriesExist() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.mkdir(TEMPLATES_DIR, { recursive: true })
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating directories:', error)
  }
}

/**
 * Сохраняет шаблон на сервере
 */
export async function saveTemplate(fileBuffer: Buffer, fileName: string): Promise<string> {
  await ensureDirectoriesExist()
  
  const filePath = path.join(TEMPLATES_DIR, fileName)
  await fs.writeFile(filePath, fileBuffer)
  
  return filePath
}

/**
 * Сохраняет сгенерированный документ на сервере
 */
export async function saveDocument(fileBuffer: Buffer, fileName: string): Promise<string> {
  await ensureDirectoriesExist()
  
  const filePath = path.join(DOCUMENTS_DIR, fileName)
  await fs.writeFile(filePath, fileBuffer)
  
  return filePath
}

/**
 * Читает шаблон с сервера
 */
export async function readTemplate(filePath: string): Promise<Buffer> {
  try {
    // Проверяем существование файла
    await fs.access(filePath)
    const buffer = await fs.readFile(filePath)
    if (!buffer || buffer.length === 0) {
      throw new Error('Файл шаблона пуст')
    }
    return buffer
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Файл шаблона не найден: ${filePath}`)
    }
    throw new Error(`Ошибка чтения файла шаблона: ${error.message}`)
  }
}

/**
 * Читает документ с сервера
 */
export async function readDocument(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath)
}

/**
 * Удаляет файл с сервера
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Error deleting file:', error)
  }
}

/**
 * Генерирует уникальное имя файла
 */
export function generateFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = path.extname(originalName)
  const name = path.basename(originalName, ext)
  const prefixPart = prefix ? `${prefix}_` : ''
  
  return `${prefixPart}${name}_${timestamp}_${random}${ext}`
}

