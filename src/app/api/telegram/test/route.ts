import { NextRequest, NextResponse } from 'next/server'

/**
 * Тестовый endpoint для проверки работы webhook
 * Можно использовать для симуляции запроса от Telegram
 */
export async function POST(request: NextRequest) {
  console.log('=== Test endpoint POST request received ===')
  console.log('Request URL:', request.url)
  console.log('Request method:', request.method)
  console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))
  
  try {
    console.log('Attempting to parse request body...')
    const body = await request.json()
    console.log('Request body parsed:', JSON.stringify(body, null, 2))
    
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
    console.log('Sending test message to webhook:', webhookUrl.toString())
    console.log('Test message:', JSON.stringify(testMessage, null, 2))
    
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    })
    
    console.log('Webhook response status:', response.status)
    const result = await response.json()
    console.log('Webhook response:', JSON.stringify(result, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Test message sent to webhook',
      webhookResponse: result,
      testMessage: testMessage,
    })
  } catch (error) {
    console.error('=== Error in test endpoint ===')
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
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
  console.log('=== Test endpoint GET request (info) ===')
  return NextResponse.json({
    message: 'Test endpoint for Telegram webhook',
    usage: 'POST to this endpoint with optional { "text": "your message" } to test webhook',
    example: {
      method: 'POST',
      body: {
        text: 'Your test message here',
      },
    },
    note: 'Check server logs for detailed information when sending POST requests',
  })
}

