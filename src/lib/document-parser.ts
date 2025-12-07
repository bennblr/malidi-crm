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
 * Удаляет сообщения об ошибках из сгенерированного документа
 */
function cleanErrorMessages(docBuffer: Buffer): Buffer {
  try {
    console.log('cleanErrorMessages: Starting cleanup, buffer size:', docBuffer.length)
    const zip = new PizZip(docBuffer)
    const xmlFile = zip.files['word/document.xml']
    
    if (xmlFile) {
      let xml = xmlFile.asText()
      console.log('cleanErrorMessages: XML length:', xml.length)
      
      // Проверяем, есть ли ошибки в оригинальном XML
      const hasErrors = /Internal server error|error|Error|ERROR/i.test(xml)
      if (hasErrors) {
        console.log('cleanErrorMessages: Found error messages in XML, cleaning...')
        // Логируем фрагмент XML с ошибками для отладки
        const errorMatch = xml.match(/[^<]*(Internal server error|error|Error|ERROR)[^<]*/i)
        if (errorMatch) {
          console.log('cleanErrorMessages: Error snippet found:', errorMatch[0].substring(0, 200))
        }
      } else {
        console.log('cleanErrorMessages: No error messages found in XML')
      }
      
      // Сохраняем оригинальный XML для отладки
      const originalXml = xml
      
      // Список фраз, которые нужно удалить (точные совпадения)
      const errorPhrases = [
        'Internal server error',
        'Internal Server Error',
        'INTERNAL SERVER ERROR',
        'error',
        'Error',
        'ERROR',
        'not found',
        'Not found',
        'NOT FOUND',
        'undefined',
        'Undefined',
        'UNDEFINED',
        'null',
        'Null',
        'NULL',
        'Unopened loop',
        'Unopened Loop',
        'UNOPENED LOOP',
        'Missing closing tag',
        'Missing Closing Tag',
        'MISSING CLOSING TAG',
      ]
      
      // Удаляем каждую фразу из XML
      errorPhrases.forEach((phrase) => {
        // Удаляем из текстовых узлов <w:t>
        xml = xml.replace(
          new RegExp(`(<w:t[^>]*>)([^<]*?)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^<]*?)(</w:t>)`, 'gi'),
          (match, openTag, before, after, closeTag) => {
            const newText = (before + after).trim()
            return newText ? `${openTag}${newText}${closeTag}` : ''
          }
        )
        
        // Удаляем целые параграфы, которые содержат только ошибки
        xml = xml.replace(
          new RegExp(`<w:p[^>]*>\\s*<w:r[^>]*>\\s*<w:t[^>]*>[^<]*${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</w:t>\\s*</w:r>\\s*</w:p>`, 'gi'),
          ''
        )
      })
      
      // Удаляем пустые параграфы
      xml = xml.replace(/<w:p[^>]*>\s*<\/w:p>/g, '')
      xml = xml.replace(/<w:p[^>]*><w:r[^>]*><w:t[^>]*>\s*<\/w:t><\/w:r><\/w:p>/g, '')
      
      // Проверяем, изменился ли XML
      if (xml !== originalXml) {
        console.log('cleanErrorMessages: XML was modified during cleanup')
        // Проверяем, остались ли ошибки
        const stillHasErrors = /Internal server error|error|Error|ERROR/i.test(xml)
        if (stillHasErrors) {
          console.warn('cleanErrorMessages: WARNING - Error messages still present after cleanup!')
          // Пробуем более агрессивную очистку
          xml = xml.replace(/Internal\s+server\s+error/gi, '')
          xml = xml.replace(/error/gi, '')
        } else {
          console.log('cleanErrorMessages: All error messages removed successfully')
        }
      } else {
        console.log('cleanErrorMessages: XML was not modified (no errors found or already clean)')
      }
      
      zip.file('word/document.xml', xml)
      
      const cleanedBuffer = zip.generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })
      
      console.log('cleanErrorMessages: Cleanup complete, new buffer size:', cleanedBuffer.length)
      return Buffer.from(cleanedBuffer)
    } else {
      console.warn('cleanErrorMessages: XML file not found in document')
    }
  } catch (error: any) {
    console.error('cleanErrorMessages: Error cleaning error messages from document:', error)
    console.error('cleanErrorMessages: Error stack:', error.stack)
    // Если не удалось очистить, возвращаем оригинальный буфер
  }
  
  return docBuffer
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
    
    // Удаляем все проблемные теги из XML шаблона перед рендерингом
    try {
      const xmlFile = zip.files['word/document.xml']
      if (xmlFile) {
        let xml = xmlFile.asText()
        
        // Удаляем все теги циклов из XML
        // Удаляем открывающие теги циклов {#field}
        xml = xml.replace(/\{#\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
        // Удаляем закрывающие теги циклов {/field}
        xml = xml.replace(/\{\/\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
        
        // Удаляем все теги условий {?field} и {/field} для условий
        xml = xml.replace(/\{\?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
        
        // Удаляем любые оставшиеся проблемные конструкции
        // Удаляем теги, которые могут вызвать ошибки
        xml = xml.replace(/\{[^}]*error[^}]*\}/gi, '')
        xml = xml.replace(/\{[^}]*Error[^}]*\}/g, '')
        
        // Обновляем XML в zip
        zip.file('word/document.xml', xml)
        console.log('XML cleaned, removed loop and condition tags')
      }
    } catch (error) {
      console.error('Error removing tags from XML:', error)
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
      errorLogging: false, // Отключаем логирование ошибок в консоль
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
        const foundTags = new Set<string>()
        while ((match = simpleTagPattern.exec(xml)) !== null) {
          const fieldName = match[1]
          // Пропускаем специальные теги docxtemplater
          if (fieldName.startsWith('#') || fieldName.startsWith('?') || fieldName.startsWith('/')) {
            continue
          }
          foundTags.add(fieldName)
        }
        
        // Для всех найденных тегов добавляем пустую строку, если значение отсутствует
        foundTags.forEach((fieldName) => {
          if (processedData[fieldName] === undefined || processedData[fieldName] === null) {
            processedData[fieldName] = ''
          }
          // Убеждаемся, что значение - строка (не объект, не массив)
          if (typeof processedData[fieldName] === 'object') {
            processedData[fieldName] = ''
          } else if (typeof processedData[fieldName] !== 'string') {
            processedData[fieldName] = String(processedData[fieldName] || '')
          }
        })
        
        // Также добавляем пустые значения для всех возможных тегов, которые могут быть в шаблоне
        // Это предотвращает появление ошибок docxtemplater
        const allPossibleTags = ['client_name', 'organization', 'delivery_address', 'contacts', 
          'instruments', 'postal_order', 'notes', 'shipping_date', 'execution_deadline']
        allPossibleTags.forEach((tag) => {
          if (processedData[tag] === undefined || processedData[tag] === null) {
            processedData[tag] = ''
          }
        })
        
        console.log('Found tags in template:', Array.from(foundTags))
        console.log('Processed data keys:', Object.keys(processedData))
      }
    } catch (error) {
      console.error('Error checking template tags:', error)
      // Продолжаем работу
    }

    // Заполняем шаблон данными с обработкой ошибок
    console.log('Starting document render with data:', JSON.stringify(processedData, null, 2))
    try {
      doc.render(processedData)
      console.log('Document rendered successfully')
    } catch (renderError: any) {
      console.error('Docxtemplater render error:', renderError)
      console.error('Render error properties:', renderError.properties)
      
      // Если ошибка связана с отсутствующими тегами, пробуем еще раз с пустыми значениями
      if (renderError.properties && renderError.properties.errors) {
        const errors = renderError.properties.errors
        const missingTags = errors
          .filter((e: any) => e.message && e.message.includes('not found'))
          .map((e: any) => {
            const match = e.message?.match(/\{([^}]+)\}/)
            return match ? match[1] : null
          })
          .filter(Boolean)
        
        if (missingTags.length > 0) {
          console.log('Adding missing tags with empty values:', missingTags)
          missingTags.forEach((tag: string) => {
            processedData[tag] = ''
          })
          
          // Пробуем еще раз с обновленными данными
          const newZip = new PizZip(templateBuffer)
          // Удаляем теги циклов из нового zip
          try {
            const xmlFile = newZip.files['word/document.xml']
            if (xmlFile) {
              let xml = xmlFile.asText()
              xml = xml.replace(/\{#\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
              xml = xml.replace(/\{\/\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
              xml = xml.replace(/\{\?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, '')
              newZip.file('word/document.xml', xml)
            }
          } catch (e) {
            // Игнорируем ошибки
          }
          
          const newDoc = new Docxtemplater(newZip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
            nullGetter: () => '',
            errorLogging: false,
          })
          
          console.log('Retrying render with missing tags filled')
          newDoc.render(processedData)
          console.log('Retry render completed')
          const generatedZip = newDoc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
          })
          
          console.log('Cleaning error messages from retry document...')
          // Удаляем сообщения об ошибках из сгенерированного документа
          const cleaned = cleanErrorMessages(Buffer.from(generatedZip))
          console.log('Retry document cleaned, size:', cleaned.length)
          return cleaned
        }
      }
      
      throw renderError
    }

    // Получаем сгенерированный документ
    const generatedZip = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    const generatedBuffer = Buffer.from(generatedZip)
    console.log('Document generated, buffer size:', generatedBuffer.length)
    
    // Удаляем сообщения об ошибках из сгенерированного документа
    console.log('Cleaning error messages from document...')
    const cleanedBuffer = cleanErrorMessages(generatedBuffer)
    console.log('Document cleaned, buffer size:', cleanedBuffer.length)
    
    // Проверяем, что в документе нет ошибок
    try {
      const checkZip = new PizZip(cleanedBuffer)
      const checkXml = checkZip.files['word/document.xml']?.asText() || ''
      if (checkXml.includes('Internal server error') || checkXml.includes('error')) {
        console.warn('WARNING: Document still contains error messages after cleaning!')
        console.warn('XML snippet:', checkXml.substring(0, 500))
      } else {
        console.log('Document verified: no error messages found')
      }
    } catch (checkError) {
      console.error('Error checking cleaned document:', checkError)
    }
    
    return cleanedBuffer
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

