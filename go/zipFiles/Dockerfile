# Build stage
FROM golang:1.26-alpine AS builder

# Install git if needed for go mod downloads
RUN apk add --no-cache git

# Set up the directory structure to match the replace directive
WORKDIR /app/zipFiles
COPY go/shared /app/shared

# Copy go.mod files
COPY go/zipFiles/go.mod go/zipFiles/go.sum ./

# Download dependencies (now ../shared will point to /app/shared)
RUN go mod download

# Copy the rest of the source code
COPY go/zipFiles/ .

# Build the binary
RUN go build -o zipFiles .

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/zipFiles/zipFiles .

EXPOSE 8080
CMD ["./zipFiles"]