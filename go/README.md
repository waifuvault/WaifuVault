# Go Microservices

This directory contains the Go microservices for WaifuVault.

## Structure

- **shared/** – Common utilities and middleware used across microservices
- **[thumbnails/](thumbnails/README.md)** – Thumbnail generation microservice
- **[zipFiles/](zipFiles/README.md)** – Zip file handling microservice

## Building

Each microservice has its own `Dockerfile` for containerized deployment.
