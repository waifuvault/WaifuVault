# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install git if needed for go mod downloads (Alpine images might not include it)
RUN apk add --no-cache git

# Copy go.mod (and go.sum, if available)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build the binary
COPY . .
RUN go build -o zipFiles .

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/zipFiles .

EXPOSE 8080
CMD ["./zipFiles"]
