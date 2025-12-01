#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== npm Publish Script ===${NC}"

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to npm${NC}"
    echo "Please run 'npm login' first"
    exit 1
fi

echo -e "${GREEN}Logged in as: $(npm whoami)${NC}"

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")
echo -e "Publishing version: ${YELLOW}${VERSION}${NC}"

# Confirm before publishing
read -p "Continue with publish? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Build static version
echo -e "${YELLOW}Building static version...${NC}"
pnpm build:static

# Publish to npm
echo -e "${YELLOW}Publishing to npm...${NC}"
pnpm publish --no-git-checks --access public

echo -e "${GREEN}Successfully published inotmovingtoday@${VERSION} to npm!${NC}"
