import TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

export function getTelegramBot(): TelegramBot | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN is not set')
    return null
  }

  if (!bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })
  }

  return bot
}

export async function sendTelegramMessage(
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const telegramBot = getTelegramBot()
    if (!telegramBot) {
      return false
    }

    await telegramBot.sendMessage(chatId, message, { parse_mode: 'HTML' })
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
    const telegramBot = getTelegramBot()
    if (!telegramBot || !process.env.TELEGRAM_BOT_TOKEN) {
      return false
    }

    // Используем прямой вызов Telegram Bot API для постановки реакции
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setMessageReaction`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: 'emoji', emoji: '👍' }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn('Failed to set reaction, using alternative method:', errorData)
      // Альтернатива: отправляем сообщение с эмодзи 👍
      await telegramBot.sendMessage(chatId, '👍', { reply_to_message_id: messageId })
    }
    
    return true
  } catch (error) {
    console.error('Error liking message:', error)
    // В случае ошибки просто игнорируем - это не критично
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
    const telegramBot = getTelegramBot()
    if (!telegramBot) {
      return false
    }

    // Формируем теги пользователей
    const userTags = responsibleUserIds.map(userId => `<a href="tg://user?id=${userId}">@user</a>`).join(' ')
    
    const message = `❌ <b>Не удалось создать заявку</b>\n\n${errorMessage}\n\n${userTags ? `Ответственные: ${userTags}` : ''}`
    
    await telegramBot.sendMessage(chatId, message, { 
      parse_mode: 'HTML',
      reply_to_message_id: messageId
    })
    return true
  } catch (error) {
    console.error('Error sending error message:', error)
    return false
  }
}

