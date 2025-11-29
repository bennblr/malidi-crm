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
        result.instruments = match[1].trim().replace(/___SEPARATOR___/g, '').trim()
        console.log('Parser: Found instruments:', result.instruments.substring(0, 100))
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

