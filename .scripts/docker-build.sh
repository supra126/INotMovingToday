#!/bin/bash

# Docker Hub image name
IMAGE_NAME="supra126/inotmovingtoday"
VERSION="${1:-latest}"

echo "Building and pushing $IMAGE_NAME:$VERSION"

# Build and push multi-platform Docker image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$IMAGE_NAME:$VERSION" \
  -t "$IMAGE_NAME:latest" \
  --push \
  .
