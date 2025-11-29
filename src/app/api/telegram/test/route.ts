import { NextRequest, NextResponse } from 'next/server'

/**
 * Тестовый endpoint для проверки работы webhook
 * Можно использовать для симуляции запроса от Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Симулируем структуру запроса от Telegram
    const testMessage = {
      message: {
        message_id: 123,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Test',
        },
        chat: {
          id: -1001234567890,
          title: 'Test Chat',
          type: 'supergroup',
        },
        date: Math.floor(Date.now() / 1000),
        text: body.text || `Приборы:
Алкотестер S/N: 10505217 Динго В-02
_______________________________
Адрес доставки:
Червень Ленинская 54
_______________________________
Контактные данные:
Калько Александр Анатольевич +375336704085 chervenforestry@yandex.by
_______________________________
Организация
Государственное лесохозяйственное учреждение «Червенский лесхоз»
_______________________________
Дата отправки:
2025-12-01
_______________________________
Сообщение заказчика:

_______________________________
AUTOLIGHTEXPRESS ордер № 600000269006
Ордер создан успешно`,
      },
    }
    
    // Перенаправляем на webhook endpoint
    const webhookUrl = new URL('/api/telegram/webhook', request.url)
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Test message sent to webhook',
      webhookResponse: result,
    })
  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test message',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test endpoint for Telegram webhook',
    usage: 'POST to this endpoint with optional { "text": "your message" } to test webhook',
    example: {
      method: 'POST',
      body: {
        text: 'Your test message here',
      },
    },
  })
}

