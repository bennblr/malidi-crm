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
    
    // Удаляем все данные циклов (циклы отключены)
    // Ищем все ключи, которые могут быть циклами, и удаляем их
    for (const key in processedData) {
      const value = processedData[key]
      // Если это массив, удаляем его (циклы отключены)
      if (Array.isArray(value)) {
        delete processedData[key]
      }
    }
    
    // Проверяем XML шаблона на наличие тегов циклов и передаем пустые массивы
    // Это предотвращает ошибку "Unopened loop"
    try {
      const xml = zip.files['word/document.xml']?.asText()
      if (xml) {
        // Ищем все теги циклов в XML
        const loopPattern = /\{#([a-zA-Z_][a-zA-Z0-9_]*)\}/g
        let match
        const foundLoops = new Set<string>()
        while ((match = loopPattern.exec(xml)) !== null) {
          const loopFieldName = match[1]
          foundLoops.add(loopFieldName)
        }
        
        // Для всех найденных циклов передаем пустой массив
        foundLoops.forEach((loopFieldName) => {
          processedData[loopFieldName] = []
        })
      }
    } catch (error) {
      // Игнорируем ошибки при чтении XML
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

