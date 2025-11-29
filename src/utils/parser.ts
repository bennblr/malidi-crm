export interface ParsedCardData {
  instruments: string
  deliveryAddress: string
  contacts: string
  organization: string
  shippingDate: string | null
  notes: string | null
  postalOrder: string | null
}

export function parseTelegramMessage(message: string): ParsedCardData | null {
  try {
    console.log('=== Parser: Starting to parse message ===')
    console.log('Message length:', message.length)
    console.log('Message preview (first 500 chars):', message.substring(0, 500))
    
    const result: ParsedCardData = {
      instruments: '',
      deliveryAddress: '',
      contacts: '',
      organization: '',
      shippingDate: null,
      notes: null,
      postalOrder: null,
    }

    // Нормализуем разделители - заменяем различные варианты на единый формат
    // Обрабатываем как подчеркивания, так и дефисы, и пробелы
    const normalizedMessage = message
      .replace(/[_\-\s]{3,}/g, '___SEPARATOR___') // Заменяем длинные разделители
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')

    console.log('Normalized message preview:', normalizedMessage.substring(0, 500))

    // Парсинг Приборы - более гибкий паттерн
    const instrumentsPatterns = [
      /Приборы[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Адрес доставки|Контактные данные|Организация|$)/i,
      /Приборы[:\s]+([\s\S]*?)(?:___SEPARATOR___|Адрес доставки|Контактные данные|Организация|$)/i,
    ]
    
    for (const pattern of instrumentsPatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        let instrumentsText = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        
        // Парсим серийные номера и модели из текста приборов
        // Формат: "Алкотестер S/N: 10505217 Динго В-02" или "S/N: 10505217 Динго В-02"
        // Может быть несколько приборов, разделенных переносами строк
        const instruments: string[] = []
        
        // Разбиваем на строки (приборы могут быть разделены переносами строк)
        const lines = instrumentsText.split(/\n+/).map(line => line.trim()).filter(line => line)
        
        for (const line of lines) {
          // Паттерны для поиска серийного номера и модели
          // Формат: "Алкотестер S/N: 10505217 Динго В-02"
          // Или: "S/N: 10505217 Динго В-02"
          // Или: "10505217 Динго В-02"
          const serialPatterns = [
            // Полный формат: "Алкотестер S/N: 10505217 Динго В-02"
            // Ищем: тип прибора + S/N: + номер + модель
            /^([А-Яа-яA-Za-z\s]+?)\s+(?:S\/N|S\.N\.|Серийный номер|С\/Н)[:\s]*(\d+)\s+([А-Яа-яA-Za-z0-9\s\-]+)$/i,
            // Формат: "S/N: 10505217 Динго В-02" или "S/N 10505217 Динго В-02"
            /^(?:S\/N|S\.N\.|Серийный номер|С\/Н)[:\s]*(\d+)\s+([А-Яа-яA-Za-z0-9\s\-]+)$/i,
            // Формат: "10505217 Динго В-02" (только номер и модель)
            /^(\d+)\s+([А-Яа-яA-Za-z0-9\s\-]+)$/,
          ]
          
          let found = false
          for (const pattern of serialPatterns) {
            const serialMatch = line.match(pattern)
            if (serialMatch) {
              // Для первого паттерна: [0]=вся строка, [1]=тип прибора, [2]=номер, [3]=модель
              // Для второго паттерна: [0]=вся строка, [1]=номер, [2]=модель
              // Для третьего паттерна: [0]=вся строка, [1]=номер, [2]=модель
              
              if (serialMatch.length === 4) {
                // Первый паттерн: есть тип прибора
                const deviceType = serialMatch[1].trim()
                const serialNumber = serialMatch[2]
                const model = serialMatch[3].trim()
                instruments.push(`${deviceType} S/N: ${serialNumber} ${model}`)
              } else if (serialMatch.length === 3) {
                // Второй или третий паттерн: только номер и модель
                const serialNumber = serialMatch[1]
                const model = serialMatch[2].trim()
                instruments.push(`S/N: ${serialNumber} ${model}`)
              }
              found = true
              console.log('Parser: Parsed instrument:', serialMatch[0])
              break
            }
          }
          
          // Если не нашли паттерн, добавляем строку как есть
          if (!found && line.length > 0) {
            instruments.push(line)
          }
        }
        
        // Если нашли структурированные данные, используем их, иначе исходный текст
        if (instruments.length > 0 && instruments.some(instr => instr.includes('S/N:'))) {
          result.instruments = instruments.join('\n')
          console.log('Parser: Found structured instruments:', instruments)
        } else {
          // Если не удалось распарсить структурированно, используем исходный текст
          result.instruments = instrumentsText
        }
        
        console.log('Parser: Found instruments:', result.instruments.substring(0, 200))
        break
      }
    }

    // Парсинг Адрес доставки
    const addressPatterns = [
      /Адрес доставки[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Контактные данные|Организация|Дата отправки|$)/i,
      /Адрес доставки[:\s]+([\s\S]*?)(?:___SEPARATOR___|Контактные данные|Организация|Дата отправки|$)/i,
    ]
    
    for (const pattern of addressPatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        result.deliveryAddress = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        console.log('Parser: Found delivery address:', result.deliveryAddress.substring(0, 100))
        break
      }
    }

    // Парсинг Контактные данные
    const contactsPatterns = [
      /Контактные данные[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Организация|Дата отправки|Сообщение заказчика|$)/i,
      /Контактные данные[:\s]+([\s\S]*?)(?:___SEPARATOR___|Организация|Дата отправки|Сообщение заказчика|$)/i,
      /Контакты[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Организация|Дата отправки|Сообщение заказчика|$)/i,
    ]
    
    for (const pattern of contactsPatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        result.contacts = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        console.log('Parser: Found contacts:', result.contacts.substring(0, 100))
        break
      }
    }

    // Парсинг Организация - более гибкий
    const orgPatterns = [
      /Организация[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Дата отправки|Сообщение заказчика|AUTOLIGHTEXPRESS|$)/i,
      /Организация[:\s]+([\s\S]*?)(?:___SEPARATOR___|Дата отправки|Сообщение заказчика|AUTOLIGHTEXPRESS|$)/i,
    ]
    
    for (const pattern of orgPatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        result.organization = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        console.log('Parser: Found organization:', result.organization.substring(0, 100))
        break
      }
    }

    // Парсинг Дата отправки
    const datePatterns = [
      /Дата отправки[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|Сообщение заказчика|AUTOLIGHTEXPRESS|$)/i,
      /Дата отправки[:\s]+([\s\S]*?)(?:___SEPARATOR___|Сообщение заказчика|AUTOLIGHTEXPRESS|$)/i,
    ]
    
    for (const pattern of datePatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        const dateStr = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        if (dateStr) {
          result.shippingDate = dateStr
          console.log('Parser: Found shipping date:', result.shippingDate)
        }
        break
      }
    }

    // Парсинг Сообщение заказчика (примечания)
    const notesPatterns = [
      /Сообщение заказчика[:\s]*\n?([\s\S]*?)(?:___SEPARATOR___|AUTOLIGHTEXPRESS|ордер|$)/i,
      /Сообщение заказчика[:\s]+([\s\S]*?)(?:___SEPARATOR___|AUTOLIGHTEXPRESS|ордер|$)/i,
    ]
    
    for (const pattern of notesPatterns) {
      const match = normalizedMessage.match(pattern)
      if (match && match[1]) {
        const notes = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        if (notes && notes.length > 0) {
          result.notes = notes
          console.log('Parser: Found notes:', result.notes.substring(0, 100))
        }
        break
      }
    }

    // Парсинг почтовый ордер - более гибкий
    const orderPatterns = [
      /AUTOLIGHTEXPRESS\s+ордер\s*[№#]?\s*(\d+)/i,
      /ордер\s*[№#]?\s*(\d+)/i,
      /order\s*[№#]?\s*(\d+)/i,
    ]
    
    for (const pattern of orderPatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        result.postalOrder = match[1]
        console.log('Parser: Found postal order:', result.postalOrder)
        break
      }
    }

    // Проверяем, что обязательные поля заполнены
    const missingFields: string[] = []
    if (!result.instruments) missingFields.push('instruments')
    if (!result.deliveryAddress) missingFields.push('deliveryAddress')
    if (!result.contacts) missingFields.push('contacts')
    if (!result.organization) missingFields.push('organization')

    if (missingFields.length > 0) {
      console.log('Parser: Missing required fields:', missingFields)
      console.log('Parser: Current result:', {
        hasInstruments: !!result.instruments,
        hasDeliveryAddress: !!result.deliveryAddress,
        hasContacts: !!result.contacts,
        hasOrganization: !!result.organization,
        instruments: result.instruments.substring(0, 50),
        deliveryAddress: result.deliveryAddress.substring(0, 50),
        contacts: result.contacts.substring(0, 50),
        organization: result.organization.substring(0, 50),
      })
      return null
    }

    console.log('Parser: Successfully parsed all required fields')
    return result
  } catch (error) {
    console.error('Parser: Error parsing telegram message:', error)
    if (error instanceof Error) {
      console.error('Parser: Error message:', error.message)
      console.error('Parser: Error stack:', error.stack)
    }
    return null
  }
}

