# Исправление проблемы с webhook

## Проблема

Webhook не настроен, и в переменных окружения указан неправильный URL (`http://localhost:3000` вместо `https://malidi-crm.onrender.com`).

Также есть 6 ожидающих обновлений (`pendingUpdates: 6`), что означает, что Telegram пытался отправить сообщения, но webhook не был настроен.

## Решение

### Шаг 1: Обновите переменные окружения на Render.com

1. Откройте панель управления Render.com
2. Перейдите в ваш сервис (malidi-crm)
3. Откройте вкладку "Environment"
4. Найдите переменные:
   - `NEXTAUTH_URL`
   - `WEBHOOK_URL` (если есть)

5. Установите правильные значения:
   ```
   NEXTAUTH_URL=https://malidi-crm.onrender.com
   WEBHOOK_URL=https://malidi-crm.onrender.com
   ```

   **ВАЖНО:** 
   - Используйте HTTPS (не HTTP)
   - Используйте полный URL без слэша в конце
   - Не используйте `http://localhost:3000` для продакшена

6. Сохраните изменения
7. Дождитесь перезапуска приложения (Render автоматически перезапустит)

### Шаг 2: Настройте webhook

После обновления переменных окружения выполните:

```bash
curl -X POST https://malidi-crm.onrender.com/api/telegram/setup
```

Или откройте в браузере и выполните POST запрос:
```
https://malidi-crm.onrender.com/api/telegram/setup
```

### Шаг 3: Проверьте статус

Проверьте, что webhook настроен правильно:

```bash
curl https://malidi-crm.onrender.com/api/telegram/status
```

Должно быть:
- `webhook.configured: true`
- `webhook.actualUrl: "https://malidi-crm.onrender.com/api/telegram/webhook"`
- `webhookUrlMatches: true`

### Шаг 4: Обработка ожидающих обновлений

После настройки webhook, Telegram автоматически отправит 6 ожидающих обновлений. Проверьте логи на Render.com - должны появиться записи о получении сообщений.

## Проверка через Telegram API напрямую

Вы также можете проверить и настроить webhook напрямую через Telegram API:

```bash
# Проверка текущего статуса
curl "https://api.telegram.org/bot8587974702:AAEiDhEvnuJ_TQx4qNlYiEtGSIXSrNF3WS4/getWebhookInfo"

# Настройка webhook
curl -X POST "https://api.telegram.org/bot8587974702:AAEiDhEvnuJ_TQx4qNlYiEtGSIXSrNF3WS4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://malidi-crm.onrender.com/api/telegram/webhook"}'
```

## После настройки

1. Отправьте тестовое сообщение в Telegram чат
2. Проверьте логи на Render.com - должны появиться записи:
   - `=== Telegram webhook POST request received ===`
   - `Message text: ...`
3. Проверьте, что заявка создалась в системе

