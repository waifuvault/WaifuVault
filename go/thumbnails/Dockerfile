# Build stage
FROM golang:1.25-alpine AS builder

# Install required tools: git, pkgconf, vips-dev for libvips support, and gcc/musl-dev for CGO.
RUN apk add --no-cache git pkgconf vips-dev gcc musl-dev

# Set CGO_ENABLED=1 for building with CGO.
ENV CGO_ENABLED=1

# Set up the directory structure to match the replace directive
WORKDIR /app/thumbnails
COPY go/shared /app/shared

# Copy go.mod files
COPY go/thumbnails/go.mod go/thumbnails/go.sum ./

# Download dependencies (now ../shared will point to /app/shared)
RUN go mod download

# Install swag CLI tool
RUN go install github.com/swaggo/swag/cmd/swag@latest

# Copy the rest of the source code
COPY go/thumbnails/ .

# Generate Swagger documentation
RUN swag init --parseDependency --parseInternal

# Build the binary
RUN go build -o thumbnails .

# Final stage
FROM alpine:latest
WORKDIR /app

# Install libvips runtime library and ffmpeg (which provides ffprobe).
RUN apk add --no-cache vips ffmpeg

# Copy the binary from the build stage.
COPY --from=builder /app/thumbnails/thumbnails .

# Copy the generated docs folder
COPY --from=builder /app/thumbnails/docs ./docs

EXPOSE 8080
CMD ["./thumbnails"]