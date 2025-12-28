# Zip Files Service

A microservice for creating zip archives from multiple files.

## Features

- Create zip archives from a list of files
- Concurrent request protection (prevents duplicate zip operations)
- IP-based rate limiting per album

## Tech Stack

- [Fiber](https://gofiber.io/) – Web framework
- [klauspost/compress](https://github.com/klauspost/compress) – High-performance compression

## API Endpoints

| Method | Endpoint           | Description                              |
|--------|--------------------|------------------------------------------|
| POST   | `/api/v1/zipFiles` | Create a zip archive from provided files |

### Request Parameters

- `albumName` (query) – Name of the album to zip
- `ip` (query) – Client IP for rate limiting

### Request Body

Array of file entries to include in the zip archive.

## Configuration

Environment variables:

- `STAGE_STATUS` – Set to `dev` for development mode

## Running

```bash
go run main.go
```

## Docker

```bash
docker build -t zipfiles-service .
```
