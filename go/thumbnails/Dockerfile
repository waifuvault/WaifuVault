# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install required tools: git, pkgconf, vips-dev for libvips support, and gcc/musl-dev for CGO.
RUN apk add --no-cache git pkgconf vips-dev gcc musl-dev

# Set CGO_ENABLED=1 for building with CGO.
ENV CGO_ENABLED=1

# Copy go.mod (and go.sum, if available) and download dependencies.
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build the binary.
COPY . .
RUN go build -o thumbnails .

# Final stage
FROM alpine:latest
WORKDIR /app

# Install libvips runtime library.
RUN apk add --no-cache vips

# Copy the binary from the build stage.
COPY --from=builder /app/thumbnails .

EXPOSE 8080
CMD ["./thumbnails"]
