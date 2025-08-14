#!/bin/sh

# Generate Swagger documentation
echo "Generating Swagger documentation..."
swag init --parseDependency --parseInternal

# Start the application
echo "Starting thumbnails service..."
exec ./thumbnails