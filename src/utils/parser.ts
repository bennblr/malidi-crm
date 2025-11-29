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
    const result: ParsedCardData = {
      instruments: '',
      deliveryAddress: '',
      contacts: '',
      organization: '',
      shippingDate: null,
      notes: null,
      postalOrder: null,
    }

    // Парсинг Приборы
    const instrumentsMatch = message.match(/Приборы:\s*([\s\S]*?)(?=_{10,}|Адрес доставки:|$)/i)
    if (instrumentsMatch) {
      result.instruments = instrumentsMatch[1].trim()
    }

    // Парсинг Адрес доставки
    const addressMatch = message.match(/Адрес доставки:\s*([\s\S]*?)(?=_{10,}|Контактные данные:|$)/i)
    if (addressMatch) {
      result.deliveryAddress = addressMatch[1].trim()
    }

    // Парсинг Контактные данные
    const contactsMatch = message.match(/Контактные данные:\s*([\s\S]*?)(?=_{10,}|Организация|$)/i)
    if (contactsMatch) {
      result.contacts = contactsMatch[1].trim()
    }

    // Парсинг Организация
    const orgMatch = message.match(/Организация\s*([\s\S]*?)(?=_{10,}|Дата отправки:|$)/i)
    if (orgMatch) {
      result.organization = orgMatch[1].trim()
    }

    // Парсинг Дата отправки
    const dateMatch = message.match(/Дата отправки:\s*([\s\S]*?)(?=_{10,}|Сообщение заказчика:|$)/i)
    if (dateMatch) {
      const dateStr = dateMatch[1].trim()
      if (dateStr) {
        result.shippingDate = dateStr
      }
    }

    // Парсинг Сообщение заказчика (примечания)
    const notesMatch = message.match(/Сообщение заказчика:\s*([\s\S]*?)(?=_{10,}|AUTOLIGHTEXPRESS|$)/i)
    if (notesMatch) {
      const notes = notesMatch[1].trim()
      if (notes) {
        result.notes = notes
      }
    }

    // Парсинг почтовый ордер
    const orderMatch = message.match(/AUTOLIGHTEXPRESS ордер №\s*(\d+)/i)
    if (orderMatch) {
      result.postalOrder = orderMatch[1]
    }

    // Проверяем, что обязательные поля заполнены
    if (!result.instruments || !result.deliveryAddress || !result.contacts || !result.organization) {
      console.log('Parser: Missing required fields', {
        hasInstruments: !!result.instruments,
        hasDeliveryAddress: !!result.deliveryAddress,
        hasContacts: !!result.contacts,
        hasOrganization: !!result.organization,
      })
      return null
    }

    return result
  } catch (error) {
    console.error('Error parsing telegram message:', error)
    return null
  }
}

