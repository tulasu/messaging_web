# Messaging Web UI

SvelteKit клиент для сервиса рассылок (`messaging`). Интерфейс mobile-first, Tailwind 4.0 + формы/типографика, cookies-based auth.

## Старт

```bash
pnpm install
cp .env.example .env # задайте URL API
pnpm dev
```

`PUBLIC_API_BASE_URL` — полный URL Rust API. Клиент ходит с `credentials: include`, поэтому домен должен совпадать или поддерживать CORS+cookies.

## Основные экраны

- `GET /` — вход по e-mail + опциональный display_name. После логина сервер ставит `access_token`/`refresh_token`.
- `/messages` — история пользователя. Пагинация ленивой загрузкой, карточки статусов.
- `/messages/[id]` — детальная карточка + временная шкала попыток (`/messages/:id/attempts`).
- `/messages/new` — создание сообщения: выбор подключенного мессенджера, пагинируемый список чатов, textarea.
- `/integrations/connect` — управление токенами (`/messengers/tokens`).

401 на любом запросе триггерит фоновой `POST /auth/refresh`, после чего повторяется исходный запрос. Провал refresh → редирект на страницу входа.

## Скрипты

| Команда      | Назначение            |
| ------------ | --------------------- |
| `pnpm dev`   | dev-сервер SvelteKit  |
| `pnpm lint`  | prettier + eslint     |
| `pnpm check` | `svelte-check` + типы |
| `pnpm build` | прод-бандел           |
