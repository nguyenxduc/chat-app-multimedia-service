# ChatApp Multimedia Service

Workspace for the ChatApp multimedia service.

## Structure

```text
packages/
  common/
services/
  multimedia-service/
```

`services/multimedia-service` exposes the media API. It stores uploaded files in
`MULTIMEDIA_UPLOAD_DIR` and keeps sidecar JSON metadata for each file.

## Environment

Copy `.env.example` to `.env` and set `INTERNAL_API_TOKEN`.

```env
NODE_ENV=development
MULTIMEDIA_SERVICE_PORT=4004
MULTIMEDIA_UPLOAD_DIR=./data/uploads
INTERNAL_API_TOKEN=replace-with-a-long-random-token
MAX_UPLOAD_BYTES=26214400
ALLOWED_MIME_TYPES=
```

`ALLOWED_MIME_TYPES` is optional. Use a comma-separated allow list such as:

```env
ALLOWED_MIME_TYPES=image/png,image/jpeg,video/mp4
```

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm --filter @chatapp/multimedia-service start
```

## Docker

```bash
docker compose up --build
```

The service listens on `http://localhost:4004` by default.

## API

Internal calls must include:

```http
X-Internal-Token: <INTERNAL_API_TOKEN>
```

If the uploaded media should be private to a user, also pass:

```http
X-User-Id: <user-id>
```

Routes:

```text
GET  /health
POST /media
GET  /media/:id/info
GET  /media/:id
```
