/**
 * Автоматическая настройка Telegram webhook при запуске приложения
 */
import { setWebhook } from './telegram'

let webhookInitialized = false

export async function initializeWebhook() {
  // Предотвращаем повторную инициализацию
  if (webhookInitialized) {
    return
  }

  const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

  // Проверяем наличие необходимых переменных
  if (!BOT_TOKEN) {
    console.log('TELEGRAM_BOT_TOKEN не установлен, пропускаем настройку webhook')
    return
  }

  if (!WEBHOOK_URL) {
    console.log('WEBHOOK_URL и NEXTAUTH_URL не установлены, пропускаем настройку webhook')
    return
  }

  // Пропускаем настройку для localhost (только для продакшена)
  if (WEBHOOK_URL.includes('localhost') || WEBHOOK_URL.includes('127.0.0.1')) {
    console.log('WEBHOOK_URL указывает на localhost, пропускаем автоматическую настройку webhook')
    return
  }

  try {
    // Убеждаемся, что URL правильный (HTTPS, без слэша в конце)
    let webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    webhookUrl = webhookUrl.replace(/\/+$/, '') // Убираем слэши в конце
    
    if (!webhookUrl.startsWith('https://')) {
      console.log('Webhook URL должен использовать HTTPS, пропускаем настройку')
      return
    }

    console.log('=== Автоматическая настройка Telegram webhook ===')
    console.log(`Webhook URL: ${webhookUrl}`)
    
    const result = await setWebhook(webhookUrl)
    
    if (result.success) {
      console.log('✅ Webhook успешно настроен автоматически')
      webhookInitialized = true
    } else {
      console.error('❌ Ошибка при автоматической настройке webhook:', result.error)
    }
  } catch (error) {
    console.error('Ошибка при автоматической настройке webhook:', error)
  }
}

