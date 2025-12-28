# Thumbnail Service

A microservice for generating thumbnails from images and videos using libvips and ffmpeg.

## Features

- Generate thumbnails from uploaded files
- Generate thumbnails from file tokens
- Generate thumbnails from URLs
- Support for animated thumbnails (GIF, WebP, HEIF)
- Batch thumbnail generation for albums
- Redis caching for performance

## Tech Stack

- [Fiber](https://gofiber.io/) – Web framework
- [govips](https://github.com/davidbyttow/govips) – libvips bindings for image processing
- [Redis](https://redis.io/) – Caching and state management
- [GORM](https://gorm.io/) – ORM for PostgreSQL/SQLite
- [Swagger](https://swagger.io/) – API documentation

## API Endpoints

| Method | Endpoint                                | Description                           |
|--------|-----------------------------------------|---------------------------------------|
| POST   | `/api/v1/generateThumbnail`             | Generate thumbnail from uploaded file |
| GET    | `/api/v1/generateThumbnail/:fileToken`  | Generate thumbnail from file token    |
| GET    | `/api/v1/generateThumbnail/ext/fromURL` | Generate thumbnail from URL           |
| POST   | `/api/v1/generateThumbnails`            | Batch generate thumbnails for album   |
| GET    | `/api/v1/generateThumbnails/supported`  | Get list of supported file extensions |

## Configuration

Environment variables:

- `REDIS_URI` – Redis connection URI
- `THUMBNAIL_SERVICE_BASE_URL` – Base URL for the service
- `NODE_ENV` – Set to `development` for local development
- `STAGE_STATUS` – Set to `dev` for development mode

## Running

```bash
go run main.go
```

## Docker

```bash
docker build -t thumbnail-service .
```

## Swagger Documentation

Available at `/swagger/` when the service is running.
