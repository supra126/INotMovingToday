#!/bin/bash

# Build and push multi-platform Docker image to Docker Hub
docker buildx build --platform linux/amd64,linux/arm64 -t supra126/inotmovingtoday:latest --push .
