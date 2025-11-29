/**
 * Прямое использование Telegram Bot API через HTTP запросы
 * Без использования библиотеки node-telegram-bot-api
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

/**
 * Выполняет запрос к Telegram Bot API
 */
async function callTelegramAPI(
  method: string,
  params: Record<string, any> = {}
): Promise<any> {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

  if (!BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
  }

  const url = `${TELEGRAM_API_BASE}${BOT_TOKEN}/${method}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Telegram API error: ${errorData.description || response.statusText}`
      )
    }

    const data = await response.json()
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`)
    }

    return data.result
  } catch (error) {
    console.error(`Error calling Telegram API method ${method}:`, error)
    throw error
  }
}

/**
 * Отправляет сообщение в Telegram чат
 */
export async function sendTelegramMessage(
  chatId: string | number,
  message: string
): Promise<boolean> {
  try {
    await callTelegramAPI('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    })
    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

/**
 * Ставит лайк на сообщение в Telegram
 * Использует setMessageReaction API (доступно с Bot API 6.0+)
 */
export async function likeMessage(
  chatId: string | number,
  messageId: number
): Promise<boolean> {
  try {
    await callTelegramAPI('setMessageReaction', {
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji: '👍' }],
    })
    return true
  } catch (error) {
    console.warn('Failed to set reaction, using alternative method:', error)
    // Альтернатива: отправляем сообщение с эмодзи 👍
    try {
      await callTelegramAPI('sendMessage', {
        chat_id: chatId,
        text: '👍',
        reply_to_message_id: messageId,
      })
    } catch (fallbackError) {
      console.error('Error sending fallback reaction:', fallbackError)
    }
    return false
  }
}

/**
 * Получает информацию о пользователе Telegram по ID
 */
async function getTelegramUserInfo(userId: number): Promise<{ username?: string; first_name?: string } | null> {
  try {
    // Используем getChatMember для получения информации о пользователе в чате
    // Но это работает только если пользователь в чате
    // Альтернатива - использовать getChat, но это тоже требует, чтобы пользователь был в чате
    // Для упоминания по ID можно использовать просто формат с ID
    return null // Пока возвращаем null, используем ID напрямую
  } catch (error) {
    console.error('Error getting user info:', error)
    return null
  }
}

/**
 * Отправляет сообщение с тегами пользователей
 * responsibleUserIds может содержать как числовые ID, так и username (строки)
 */
export async function sendErrorMessageWithTags(
  chatId: string | number,
  messageId: number,
  errorMessage: string,
  responsibleUserIds: (number | string)[]
): Promise<boolean> {
  try {
    // Формируем теги пользователей
    // Поддерживаем как числовые ID, так и username (строки)
    const userTags = responsibleUserIds
      .map(userIdOrUsername => {
        // Если это число - используем формат с ID
        if (typeof userIdOrUsername === 'number') {
          return `<a href="tg://user?id=${userIdOrUsername}">@user</a>`
        }
        // Если это строка - проверяем, это username или ID в виде строки
        const str = String(userIdOrUsername).trim()
        // Если строка начинается с @, убираем его
        const username = str.startsWith('@') ? str.substring(1) : str
        // Если строка состоит только из цифр - это ID
        if (/^\d+$/.test(username)) {
          return `<a href="tg://user?id=${username}">@user</a>`
        }
        // Иначе это username - используем его напрямую
        return `@${username}`
      })
      .join(' ')
    
    const message = `❌ <b>Не удалось создать заявку</b>\n\n${errorMessage}\n\n${userTags ? `Ответственные: ${userTags}` : ''}`
    
    await callTelegramAPI('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      reply_to_message_id: messageId,
    })
    return true
  } catch (error) {
    console.error('Error sending error message:', error)
    return false
  }
}

/**
 * Настраивает webhook для Telegram бота
 */
export async function setWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    console.log('=== Setting webhook ===')
    console.log('Webhook URL:', webhookUrl)
    console.log('BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? `${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET')
    
    const result = await callTelegramAPI('setWebhook', {
      url: webhookUrl,
    })
    
    console.log('Webhook set successfully, result:', JSON.stringify(result, null, 2))
    
    // Проверяем результат - Telegram API возвращает { ok: true, result: true, description: "..." }
    if (result === true || result === undefined) {
      console.log('Webhook configured successfully')
      return { success: true }
    }
    
    return { success: true, details: result }
  } catch (error) {
    console.error('=== Error setting webhook ===')
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { 
      success: false, 
      error: errorMessage,
      details: error
    }
  }
}

/**
 * Получает информацию о текущем webhook
 */
export async function getWebhookInfo(): Promise<any> {
  try {
    console.log('=== Getting webhook info ===')
    const result = await callTelegramAPI('getWebhookInfo')
    console.log('Webhook info result:', JSON.stringify(result, null, 2))
    
    // Telegram API возвращает объект с полями url, has_custom_certificate, pending_update_count и т.д.
    // Если url пустой или отсутствует, возвращаем объект с url: ''
    if (!result || typeof result !== 'object') {
      console.warn('Unexpected webhook info format:', result)
      return { url: '', pending_update_count: 0 }
    }
    
    return result
  } catch (error) {
    console.error('Error getting webhook info:', error)
    // В случае ошибки возвращаем пустой объект вместо throw
    return { url: '', pending_update_count: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

