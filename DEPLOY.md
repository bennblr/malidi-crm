# Инструкция по деплою на Render.com

## Подготовка к деплою

### 1. Настройка переменных окружения на Render.com

В настройках вашего сервиса на Render.com добавьте следующие переменные окружения:

```
DATABASE_URL=postgresql://alco_crm_bd_user:EyTgE08f8CfmvoM5xIHq0rwN2lC0unG2@dpg-d4ldinili9vc73e7v7v0-a.oregon-postgres.render.com/alco_crm_bd
NEXTAUTH_URL=https://your-app-name.onrender.com
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
TELEGRAM_BOT_TOKEN=8587974702:AAEiDhEvnuJ_TQx4qNlYiEtGSIXSrNF3WS4
WEBHOOK_URL=https://your-app-name.onrender.com
```

**Важно:** 
- Замените `your-app-name` на реальное имя вашего приложения на Render
- `NEXTAUTH_SECRET` должен быть случайной строкой (можно сгенерировать через `openssl rand -base64 32`)

### 2. Настройка Build Command

В настройках Build & Deploy на Render.com:

**Build Command:**
```bash
npm install && npm run prisma:generate && npm run build
```

**Start Command:**
```bash
npm start
```

### 3. Настройка базы данных

После первого деплоя выполните миграции и seed:

1. Подключитесь к вашему сервису через SSH или используйте Render Shell
2. Выполните:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

Или создайте отдельный скрипт для инициализации БД.

### 4. Настройка Telegram Webhook

**ВАЖНО:** Бот работает через webhook, а не как отдельный процесс. После деплоя обязательно настройте webhook!

После успешного деплоя настройте webhook для Telegram бота:

#### Вариант 1: Через API endpoint (рекомендуется)

Откройте в браузере или выполните curl запрос:
```
POST https://your-app-name.onrender.com/api/telegram/setup
```

Или через curl:
```bash
curl -X POST https://your-app-name.onrender.com/api/telegram/setup
```

Это автоматически настроит webhook на ваш сервер.

#### Вариант 2: Через скрипт локально

1. Убедитесь, что в `.env` указан правильный `WEBHOOK_URL`
2. Выполните:
   ```bash
   npm run telegram:setup-webhook
   ```

#### Вариант 3: Прямой вызов Telegram API

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app-name.onrender.com/api/telegram/webhook"}'
```

### 5. Проверка webhook

Проверьте статус webhook:

```
GET https://your-app-name.onrender.com/api/telegram/setup
```

Или через curl:
```bash
curl https://your-app-name.onrender.com/api/telegram/setup
```

### 6. Тестирование бота

1. Добавьте бота в Telegram чат
2. Отправьте тестовое сообщение в формате заявки
3. Проверьте логи на Render.com - должны появиться записи о получении webhook
4. Проверьте, что заявка создалась в системе

## Устранение проблем

### Бот не отвечает

1. Проверьте, что webhook настроен:
   ```bash
   curl https://your-app-name.onrender.com/api/telegram/setup
   ```

2. Проверьте логи приложения на Render.com

3. Убедитесь, что переменные окружения установлены правильно

4. Проверьте, что URL webhook доступен из интернета (должен возвращать 200 OK)

### Ошибки при сборке

1. Убедитесь, что все зависимости установлены
2. Проверьте, что Prisma клиент сгенерирован
3. Проверьте логи сборки на Render.com

### База данных не подключена

1. Проверьте `DATABASE_URL` в переменных окружения
2. Убедитесь, что база данных на Render.com запущена
3. Проверьте, что миграции выполнены

## Автоматическая настройка webhook при деплое

Если вы хотите автоматически настраивать webhook при каждом деплое, добавьте в `package.json`:

```json
{
  "scripts": {
    "postdeploy": "node -e \"fetch(process.env.NEXTAUTH_URL + '/api/telegram/setup', {method: 'POST'}).then(r => r.json()).then(console.log).catch(console.error)\""
  }
}
```

Но это не рекомендуется, так как webhook нужно настраивать только один раз.

## Мониторинг

- Проверяйте логи приложения на Render.com
- Используйте `/api/telegram/setup` для проверки статуса webhook
- Мониторьте ошибки в логах

