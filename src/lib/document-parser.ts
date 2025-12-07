/**
 * Парсер для извлечения тегов docxtemplater из .docx файла
 */

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

// Типы для docxtemplater
declare module 'docxtemplater' {
  interface Docxtemplater {
    render(data: any): void
    getZip(): PizZip
  }
}

export interface TemplateField {
  name: string
  type: 'simple' | 'loop' | 'condition'
  description?: string
}

/**
 * Извлекает все теги из шаблона docx
 */
export async function parseTemplateFields(fileBuffer: Buffer): Promise<TemplateField[]> {
  try {
    const zip = new PizZip(fileBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    })

    // Получаем XML содержимое документа
    const xml = doc.getZip().files['word/document.xml'].asText()
    
    const fields: TemplateField[] = []
    const foundFields = new Set<string>()

    // Паттерны для поиска тегов docxtemplater
    // Простые теги: {field_name}
    const simpleTagPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
    
    // Циклы: {#array_name}
    const loopPattern = /\{#([a-zA-Z_][a-zA-Z0-9_]*)\}/g
    
    // Условия: {?condition_name}
    const conditionPattern = /\{\?([a-zA-Z_][a-zA-Z0-9_]*)\}/g

    // Ищем простые теги
    let match
    while ((match = simpleTagPattern.exec(xml)) !== null) {
      const fieldName = match[1]
      if (!foundFields.has(fieldName)) {
        foundFields.add(fieldName)
        fields.push({
          name: fieldName,
          type: 'simple',
        })
      }
    }

    // Ищем циклы
    while ((match = loopPattern.exec(xml)) !== null) {
      const fieldName = match[1]
      if (!foundFields.has(fieldName)) {
        foundFields.add(fieldName)
        fields.push({
          name: fieldName,
          type: 'loop',
        })
      }
    }

    // Ищем условия
    while ((match = conditionPattern.exec(xml)) !== null) {
      const fieldName = match[1]
      if (!foundFields.has(fieldName)) {
        foundFields.add(fieldName)
        fields.push({
          name: fieldName,
          type: 'condition',
        })
      }
    }

    return fields
  } catch (error) {
    console.error('Error parsing template:', error)
    throw new Error('Не удалось распарсить шаблон')
  }
}

/**
 * Генерирует документ из шаблона с данными
 */
export async function generateDocument(
  templateBuffer: Buffer,
  data: Record<string, any>
): Promise<Buffer> {
  try {
    const zip = new PizZip(templateBuffer)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}',
      },
    })

    // Подготавливаем данные для docxtemplater
    const processedData: Record<string, any> = { ...data }
    
    // Убеждаемся, что все циклы переданы как массивы
    // Если массив пустой или не передан, передаем пустой массив
    for (const key in processedData) {
      const value = processedData[key]
      // Если значение undefined или null, удаляем его
      if (value === undefined || value === null) {
        continue
      }
      // Если это массив, убеждаемся что он валидный
      if (Array.isArray(value)) {
        // Фильтруем пустые элементы
        processedData[key] = value.filter(item => 
          item && typeof item === 'object' && Object.keys(item).length > 0
        )
      }
    }

    // Заполняем шаблон данными
    doc.render(processedData)

    // Получаем сгенерированный документ
    const generatedZip = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    return Buffer.from(generatedZip)
  } catch (error: any) {
    console.error('Error generating document:', error)
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors
        .map((e: any) => e.message)
        .join(', ')
      throw new Error(`Ошибка генерации документа: ${errorMessages}`)
    }
    throw new Error('Не удалось сгенерировать документ')
  }
}

