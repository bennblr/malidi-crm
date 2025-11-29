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
 * Отправляет сообщение с тегами пользователей
 */
export async function sendErrorMessageWithTags(
  chatId: string | number,
  messageId: number,
  errorMessage: string,
  responsibleUserIds: number[]
): Promise<boolean> {
  try {
    // Формируем теги пользователей
    const userTags = responsibleUserIds
      .map(userId => `<a href="tg://user?id=${userId}">@user</a>`)
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
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  try {
    await callTelegramAPI('setWebhook', {
      url: webhookUrl,
    })
    return true
  } catch (error) {
    console.error('Error setting webhook:', error)
    return false
  }
}

/**
 * Получает информацию о текущем webhook
 */
export async function getWebhookInfo(): Promise<any> {
  try {
    return await callTelegramAPI('getWebhookInfo')
  } catch (error) {
    console.error('Error getting webhook info:', error)
    throw error
  }
}

