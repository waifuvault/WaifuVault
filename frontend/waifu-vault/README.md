## WaifuVault Frontend

Next.js frontend for WaifuVault, a temporary file hosting service.

## Getting started

> **Important!** This requires Node >= 20 and TypeScript >= 5.5

> **Note:** The WaifuVault backend must be running for this frontend to work. See the main repository README for backend setup instructions.

## Migration Notice

> **⚠️ Breaking Change - Password Protected Files**
>
> Password protected file URLs have changed from `/f/` to `/p/`. If you have existing password-protected file links, you must replace `/f/` with `/p/` in the URL.
>
> **Before:** `https://waifuvault.moe/f/{token}/{filename}.jpg`
> **After:** `https://waifuvault.moe/p/{token}/{filename}.jpg`
>
> Non-password-protected files continue to use `/f/` as before.

### Environment Setup

Create a `.env` file in the root of this directory (`frontend/waifu-vault/`) with the following settings:

```env
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:8280
NEXT_PUBLIC_WAIFUVAULT_BACKEND=http://127.0.0.1:8081
NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER=dynamic
NODE_ENV=development
NEXT_PUBLIC_UPLOADER_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_DEV_ORIGINS=127.0.0.1
NEXT_PUBLIC_THUMBNAIL_SERVICE=http://127.0.0.1:5006
```

#### Environment Variables

| Setting                            | Description                                                                         |
|------------------------------------|-------------------------------------------------------------------------------------|
| NEXT_PUBLIC_BASE_URL               | The URL where the Next.js frontend is hosted (default: http://127.0.0.1:8280)       |
| NEXT_PUBLIC_WAIFUVAULT_BACKEND     | The URL where the backend API is hosted (default: http://127.0.0.1:8081)            |
| NEXT_PUBLIC_HOME_PAGE_FILE_COUNTER | Controls the file counter display: `static`, `dynamic`, or `off` (default: dynamic) |
| NODE_ENV                           | The Node environment: `development` or `production`                                 |
| NEXT_PUBLIC_UPLOADER_URL           | The URL for the uploader service                                                    |
| NEXT_PUBLIC_ALLOWED_DEV_ORIGINS    | Comma-separated list of allowed origins for development (default: 127.0.0.1)        |
| NEXT_PUBLIC_THUMBNAIL_SERVICE      | The URL for the thumbnail generation service (default: http://127.0.0.1:5006)       |

> **Note:** For production deployments, adjust these URLs to match your production environment.

### Build and Run Commands

```bash
# install dependencies
npm install

# run development server (http://localhost:8280)
npm run dev

# build for production
npm run build

# start production server
npm start

# run linter
npm run lint

# fix linting issues
npm run lint:fix

# check code formatting
npm run prettier

# fix code formatting
npm run prettier:fix
```

## Development Notes

The development server runs on port **8280** with Turbopack enabled for faster builds.

The production server runs on **localhost:8280** by default.

## Project Structure

This is a Next.js 15 application using:
- React 19
- TypeScript 5
- Sass for styling
- Socket.io for real-time updates
- Highlight.js for code highlighting
- QRCode generation support

## Backend Compatibility

This is the official frontend for WaifuVault, communicating with the backend API via the configured `NEXT_PUBLIC_WAIFUVAULT_BACKEND` URL.
