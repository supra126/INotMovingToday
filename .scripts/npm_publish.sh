#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   inotmovingtoday - npm Publish        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
    echo -e "${RED}✗ Error: Not logged in to npm${NC}"
    echo "  Please run 'npm login' first"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓ Logged in as: ${NPM_USER}${NC}"

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME=$(node -p "require('./package.json').name")

# Check if version already exists on npm
if npm view "${PACKAGE_NAME}@${VERSION}" version &> /dev/null; then
    echo -e "${RED}✗ Version ${VERSION} already exists on npm${NC}"
    echo -e "  Please update version in package.json first"
    echo -e "  Current published versions: $(npm view ${PACKAGE_NAME} versions --json 2>/dev/null | tail -1)"
    exit 1
fi

echo -e "${YELLOW}📦 Package: ${PACKAGE_NAME}${NC}"
echo -e "${YELLOW}📌 Version: ${VERSION}${NC}"
echo

# Show what will be published
echo -e "${YELLOW}Files to publish:${NC}"
npm pack --dry-run 2>/dev/null | head -20
echo

# Confirm before publishing
read -p "Continue with publish? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Build static version
echo
echo -e "${YELLOW}🔨 Building static version...${NC}"
pnpm build:static

# Publish to npm
echo
echo -e "${YELLOW}🚀 Publishing to npm...${NC}"
pnpm publish --no-git-checks --access public

echo
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Successfully published!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo
echo -e "  ${CYAN}npx inotmovingtoday${NC}"
echo
echo -e "  ${CYAN}https://www.npmjs.com/package/${PACKAGE_NAME}${NC}"
