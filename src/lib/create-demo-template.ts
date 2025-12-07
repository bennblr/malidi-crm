/**
 * Создает демонстрационный шаблон документа
 */

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveTemplate, generateFileName, ensureDirectoriesExist } from './file-storage'
import { prisma } from './db'

/**
 * Создает минимальный .docx файл с демонстрационными тегами
 */
function createDemoDocx(): Buffer {
  // Создаем минимальный .docx структуру
  const zip = new PizZip()
  
  // Минимальный XML для Word документа с тегами docxtemplater
  // Важно: циклы и условия должны быть в отдельных параграфах
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Договор с {client_name}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Организация: {organization}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Адрес доставки: {delivery_address}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Контакты: {contacts}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Приборы: {instruments}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Дата отправки: {shipping_date}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Срок исполнения: {execution_deadline}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{?notes}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Примечания: {notes}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{/notes}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Список позиций:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{#items}- {name}: {quantity} шт.{/items}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`

  // Content Types
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  
  // Relationships
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  // Word relationships
  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`

  // Добавляем файлы в ZIP
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rels)
  zip.file('word/document.xml', documentXml)
  zip.file('word/_rels/document.xml.rels', wordRels)

  // Генерируем буфер
  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })

  return Buffer.from(buffer)
}

/**
 * Создает или восстанавливает демонстрационный шаблон
 */
export async function createDemoTemplate(): Promise<void> {
  try {
    // Проверяем, существует ли уже демо-шаблон
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: 'Демонстрационный шаблон' },
    })

    if (existing) {
      // Проверяем, существует ли файл
      const fs = await import('fs/promises')
      try {
        await fs.access(existing.filePath)
        console.log('Demo template already exists and file is present')
        return
      } catch (error) {
        // Файл не существует, пересоздаем его
        console.log('Demo template exists but file is missing, recreating file...')
        const demoBuffer = createDemoDocx()
        await ensureDirectoriesExist()
        
        // Сохраняем файл заново
        const filePath = await saveTemplate(demoBuffer, existing.fileName)
        
        // Обновляем путь в БД, если он изменился
        if (filePath !== existing.filePath) {
          await prisma.documentTemplate.update({
            where: { id: existing.id },
            data: { filePath },
          })
        }
        
        console.log('✅ Demo template file recreated successfully')
        return
      }
    }

    // Получаем системного пользователя
    const systemUser = await prisma.user.findUnique({
      where: { email: 'system@telegram.bot' },
    })

    if (!systemUser) {
      console.warn('System user not found, skipping demo template creation')
      return
    }

    // Создаем демо-шаблон
    const demoBuffer = createDemoDocx()
    
    // Сохраняем файл
    await ensureDirectoriesExist()
    const fileName = generateFileName('demo_template.docx', 'template')
    const filePath = await saveTemplate(demoBuffer, fileName)

    // Поля шаблона
    const fields = [
      { name: 'client_name', type: 'simple' },
      { name: 'organization', type: 'simple' },
      { name: 'delivery_address', type: 'simple' },
      { name: 'contacts', type: 'simple' },
      { name: 'instruments', type: 'simple' },
      { name: 'shipping_date', type: 'simple' },
      { name: 'execution_deadline', type: 'simple' },
      { name: 'notes', type: 'condition' },
      { name: 'items', type: 'loop' },
    ]

    // Сохраняем в БД
    await prisma.documentTemplate.create({
      data: {
        name: 'Демонстрационный шаблон',
        description: 'Пример шаблона для демонстрации работы системы документов',
        fileName,
        filePath,
        fields: JSON.stringify(fields),
        createdBy: systemUser.id,
      },
    })

    console.log('✅ Demo template created successfully')
  } catch (error) {
    console.error('Error creating demo template:', error)
    // Не бросаем ошибку, чтобы не блокировать запуск приложения
  }
}

