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
    
    // Удаляем теги циклов из XML шаблона перед рендерингом
    try {
      const xmlFile = zip.files['word/document.xml']
      if (xmlFile) {
        let xml = xmlFile.asText()
        
        // Удаляем все теги циклов из XML
        // Паттерн для поиска циклов: {#field}...{/field}
        // Удаляем открывающие теги циклов (может быть с пробелами)
        xml = xml.replace(/\{#\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
        // Удаляем закрывающие теги циклов (может быть с пробелами)
        xml = xml.replace(/\{\/\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
        
        // Также удаляем содержимое между тегами циклов, если оно осталось
        // Это дополнительная защита на случай, если структура XML нестандартная
        
        // Обновляем XML в zip
        zip.file('word/document.xml', xml)
      }
    } catch (error) {
      console.error('Error removing loop tags from XML:', error)
      // Продолжаем работу, даже если не удалось удалить теги
    }
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}',
      },
      nullGetter: () => '', // Возвращаем пустую строку для отсутствующих значений
    })

    // Подготавливаем данные для docxtemplater
    const processedData: Record<string, any> = { ...data }
    
    // Удаляем все данные циклов (циклы отключены)
    for (const key in processedData) {
      const value = processedData[key]
      // Если это массив, удаляем его (циклы отключены)
      if (Array.isArray(value)) {
        delete processedData[key]
      }
    }
    
    // Проверяем XML на наличие всех тегов и добавляем пустые значения для отсутствующих
    try {
      const xmlFile = zip.files['word/document.xml']
      if (xmlFile) {
        const xml = xmlFile.asText()
        // Ищем все простые теги {field_name}
        const simpleTagPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
        let match
        while ((match = simpleTagPattern.exec(xml)) !== null) {
          const fieldName = match[1]
          // Пропускаем специальные теги docxtemplater
          if (fieldName.startsWith('#') || fieldName.startsWith('?') || fieldName.startsWith('/')) {
            continue
          }
          // Если тег не найден в данных, добавляем пустую строку
          if (processedData[fieldName] === undefined) {
            processedData[fieldName] = ''
          }
        }
      }
    } catch (error) {
      console.error('Error checking template tags:', error)
      // Продолжаем работу
    }

    // Заполняем шаблон данными
    try {
      doc.render(processedData)
    } catch (renderError: any) {
      console.error('Docxtemplater render error:', renderError)
      // Если ошибка рендеринга, пробуем с минимальными данными
      if (renderError.properties && renderError.properties.errors) {
        throw renderError
      }
      throw renderError
    }

    // Получаем сгенерированный документ
    const generatedZip = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    return Buffer.from(generatedZip)
  } catch (error: any) {
    console.error('Error generating document:', error)
    console.error('Error stack:', error.stack)
    console.error('Error properties:', error.properties)
    
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors
        .map((e: any) => e.message || String(e))
        .join(', ')
      throw new Error(`Ошибка генерации документа: ${errorMessages}`)
    }
    
    // Передаем оригинальное сообщение об ошибке, если оно есть
    if (error.message) {
      throw new Error(`Ошибка генерации документа: ${error.message}`)
    }
    
    throw new Error('Не удалось сгенерировать документ')
  }
}

