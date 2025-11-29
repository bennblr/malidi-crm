import { NextResponse } from 'next/server'
import { getWebhookInfo } from '@/lib/telegram'

/**
 * Endpoint для проверки статуса Telegram webhook
 * Показывает детальную информацию о настройке webhook
 */
export async function GET() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.NEXTAUTH_URL

    if (!BOT_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'TELEGRAM_BOT_TOKEN is not set',
        note: 'Добавьте TELEGRAM_BOT_TOKEN в переменные окружения',
      }, { status: 400 })
    }

    if (!WEBHOOK_URL) {
      return NextResponse.json({
        success: false,
        error: 'WEBHOOK_URL or NEXTAUTH_URL is not set',
        note: 'Добавьте WEBHOOK_URL или NEXTAUTH_URL в переменные окружения',
      }, { status: 400 })
    }

    // Получаем информацию о webhook из Telegram
    const webhookInfo = await getWebhookInfo()
    console.log('Webhook info in status endpoint:', JSON.stringify(webhookInfo, null, 2))
    
    const expectedWebhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`
    // Нормализуем URL для сравнения (убираем слэши в конце)
    const normalizedExpected = expectedWebhookUrl.replace(/\/+$/, '')
    const normalizedActual = (webhookInfo.url || '').replace(/\/+$/, '')
    const isConfigured = normalizedActual === normalizedExpected && normalizedActual !== ''
    
    console.log('Webhook comparison:', {
      expected: normalizedExpected,
      actual: normalizedActual,
      isConfigured,
    })
    
    // Проверяем статус бота через Telegram API
    const botInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    let botInfo = null
    try {
      const botInfoResponse = await fetch(botInfoUrl)
      botInfo = await botInfoResponse.json()
    } catch (error) {
      console.error('Error getting bot info:', error)
    }

    return NextResponse.json({
      success: true,
      bot: {
        token: BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...` : 'not set',
        info: botInfo?.result || null,
      },
      webhook: {
        configured: isConfigured,
        expectedUrl: expectedWebhookUrl,
        actualUrl: webhookInfo.url || 'not set',
        pendingUpdates: webhookInfo.pending_update_count || 0,
        lastError: webhookInfo.last_error_message || null,
        lastErrorDate: webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000).toISOString() : null,
        maxConnections: webhookInfo.max_connections || null,
        allowedUpdates: webhookInfo.allowed_updates || null,
        rawInfo: webhookInfo, // Добавляем сырые данные для отладки
      },
      environment: {
        webhookUrl: WEBHOOK_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
      diagnostics: {
        webhookUrlMatches: isConfigured,
        hasPendingUpdates: (webhookInfo.pending_update_count || 0) > 0,
        hasErrors: !!webhookInfo.last_error_message,
        recommendation: !isConfigured 
          ? 'Выполните POST запрос к /api/telegram/setup для настройки webhook'
          : webhookInfo.last_error_message
            ? 'Webhook настроен, но есть ошибки. Проверьте доступность URL и логи.'
            : 'Webhook настроен правильно. Если сообщения не обрабатываются, проверьте логи на получение POST запросов.',
      },
    })
  } catch (error) {
    console.error('Error getting webhook status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get webhook status',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

