# Устранение проблем с Telegram Webhook

## Проблема: В логах нет "Telegram webhook received:"

Если GET запрос к `/api/telegram/webhook` возвращает `{"status": "ok"}`, но в логах нет записей о получении POST запросов от Telegram, это означает, что webhook не настроен или Telegram не может достучаться до вашего сервера.

## Шаг 1: Проверка статуса webhook

Выполните запрос для проверки текущего статуса webhook:

```bash
curl https://your-app-name.onrender.com/api/telegram/setup
```

Или откройте в браузере:
```
https://your-app-name.onrender.com/api/telegram/setup
```

Проверьте поле `isConfigured` в ответе:
- `true` - webhook настроен
- `false` - webhook не настроен

## Шаг 2: Настройка webhook

Если webhook не настроен, выполните:

```bash
curl -X POST https://your-app-name.onrender.com/api/telegram/setup
```

Или откройте в браузере и выполните POST запрос:
```
https://your-app-name.onrender.com/api/telegram/setup
```

Это автоматически настроит webhook на ваш сервер.

## Шаг 3: Проверка доступности endpoint

Убедитесь, что endpoint доступен из интернета:

```bash
curl https://your-app-name.onrender.com/api/telegram/webhook
```

Должен вернуться:
```json
{
  "status": "ok",
  "message": "Telegram webhook endpoint is active",
  ...
}
```

## Шаг 4: Тестирование webhook локально

Используйте тестовый endpoint для проверки работы webhook:

```bash
curl -X POST https://your-app-name.onrender.com/api/telegram/test
```

Это отправит тестовое сообщение в webhook и покажет результат. В логах должны появиться записи:
- `=== Telegram webhook POST request received ===`
- `Telegram webhook received: {...}`
- `Message text: ...`

## Шаг 5: Проверка переменных окружения

Убедитесь, что на Render.com установлены правильные переменные окружения:

1. `TELEGRAM_BOT_TOKEN` - токен вашего бота
2. `WEBHOOK_URL` или `NEXTAUTH_URL` - URL вашего приложения (должен быть HTTPS!)

**Важно:** 
- URL должен быть HTTPS (не HTTP)
- URL должен быть доступен из интернета
- URL должен указывать на ваш домен на Render.com

## Шаг 6: Проверка логов

После настройки webhook и отправки сообщения в чат:

1. Откройте логи на Render.com
2. Найдите записи, начинающиеся с `=== Telegram webhook POST request received ===`
3. Если записей нет, значит Telegram не может достучаться до вашего сервера

## Возможные проблемы и решения

### Проблема: Webhook не настраивается

**Решение:**
1. Проверьте, что `TELEGRAM_BOT_TOKEN` правильный
2. Проверьте, что `WEBHOOK_URL` или `NEXTAUTH_URL` указан правильно
3. Убедитесь, что URL использует HTTPS
4. Попробуйте настроить webhook напрямую через Telegram API:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app-name.onrender.com/api/telegram/webhook"}'
```

### Проблема: Telegram не может достучаться до сервера

**Решение:**
1. Убедитесь, что приложение запущено на Render.com
2. Проверьте, что endpoint доступен из интернета (выполните GET запрос)
3. Проверьте, что URL правильный и использует HTTPS
4. Убедитесь, что нет проблем с SSL сертификатом

### Проблема: Webhook настроен, но сообщения не обрабатываются

**Решение:**
1. Проверьте логи на Render.com - должны быть записи о получении запросов
2. Используйте тестовый endpoint `/api/telegram/test` для проверки
3. Проверьте формат сообщения - он должен соответствовать ожидаемому формату
4. Убедитесь, что база данных доступна и миграции выполнены

## Проверка через Telegram Bot API напрямую

Вы можете проверить статус webhook напрямую через Telegram API:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Это покажет:
- Текущий URL webhook
- Количество ожидающих обновлений
- Последнюю ошибку (если есть)
- Время последнего обновления

## Диагностика

Для полной диагностики выполните:

1. Проверка endpoint:
   ```bash
   curl https://your-app-name.onrender.com/api/telegram/webhook
   ```

2. Проверка статуса webhook:
   ```bash
   curl https://your-app-name.onrender.com/api/telegram/setup
   ```

3. Настройка webhook:
   ```bash
   curl -X POST https://your-app-name.onrender.com/api/telegram/setup
   ```

4. Тестирование webhook:
   ```bash
   curl -X POST https://your-app-name.onrender.com/api/telegram/test
   ```

5. Проверка через Telegram API:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

Если все эти шаги выполнены, но сообщения все еще не обрабатываются, проверьте логи на Render.com для детальной информации об ошибках.

