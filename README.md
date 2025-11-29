# CRM Система контроля оборудования

Полнофункциональная CRM система для управления заявками на оборудование с канбан-доской, интеграцией Telegram бота и системой приоритетов.

## Технологический стек

- **Frontend**: Next.js 14+ (App Router), Ant Design, MobX, CSS Modules
- **Backend**: Next.js API Routes, Prisma ORM
- **База данных**: PostgreSQL
- **Аутентификация**: NextAuth.js (email/password)
- **Telegram**: node-telegram-bot-api

## Функциональность

- ✅ Канбан доска с drag-and-drop функциональностью
- ✅ Автоматический расчет приоритетов на основе времени в колонке
- ✅ Интеграция с Telegram ботом для парсинга заявок
- ✅ Управление колонками (добавление, удаление, перемещение, видимость)
- ✅ Управление приоритетами (добавление, удаление, настройка цветов)
- ✅ Фильтры и сортировки по всем полям
- ✅ Система уведомлений в Telegram
- ✅ Ролевой доступ (Администратор, Редактор)
- ✅ Управление пользователями

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd malidi
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` в корне проекта:
```env
DATABASE_URL=postgresql://alco_crm_bd_user:EyTgE08f8CfmvoM5xIHq0rwN2lC0unG2@dpg-d4ldinili9vc73e7v7v0-a.oregon-postgres.render.com/alco_crm_bd
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
```

4. Сгенерируйте Prisma клиент:
```bash
npm run prisma:generate
```

5. Выполните миграции базы данных:
```bash
npm run prisma:migrate
```

6. Заполните базу данных начальными данными:
```bash
npm run prisma:seed
```

7. Запустите сервер разработки:
```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
2. Получите токен бота
3. Добавьте токен в `.env` файл как `TELEGRAM_BOT_TOKEN`
4. Настройте webhook для бота (опционально) или используйте long polling

## Структура заявки из Telegram

Заявки должны приходить в следующем формате:

```
Приборы:
Алкотестер S/N: 10505217 Динго В-02

_______________________________
Адрес доставки:
Червень Ленинская  54 
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
Ордер создан успешно
```

## Дефолтные учетные данные

После выполнения seed:
- **Email**: admin@example.com
- **Пароль**: admin123
- **Роль**: ADMIN

## API Routes

- `/api/auth/[...nextauth]` - Аутентификация
- `/api/cards` - Управление карточками
- `/api/columns` - Управление колонками
- `/api/priorities` - Управление приоритетами
- `/api/users` - Управление пользователями (только для админов)
- `/api/settings` - Общие настройки системы
- `/api/telegram/webhook` - Webhook для Telegram бота

## Структура проекта

```
malidi/
├── prisma/
│   ├── schema.prisma      # Схема базы данных
│   └── seed.ts            # Начальные данные
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API routes
│   │   ├── (auth)/        # Страницы аутентификации
│   │   └── (dashboard)/   # Защищенные страницы
│   ├── components/        # React компоненты
│   ├── stores/            # MobX stores
│   ├── lib/               # Утилиты и конфигурация
│   └── utils/             # Вспомогательные функции
└── config/                # Конфигурационные файлы
```

## Скрипты

- `npm run dev` - Запуск сервера разработки
- `npm run build` - Сборка для продакшена
- `npm run start` - Запуск продакшен сервера
- `npm run prisma:generate` - Генерация Prisma клиента
- `npm run prisma:migrate` - Выполнение миграций
- `npm run prisma:seed` - Заполнение базы данных
- `npm run prisma:studio` - Открытие Prisma Studio

## Лицензия

MIT

