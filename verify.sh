#!/bin/bash

# Verification script for Jotto Game project

echo "🎮 Jotto Game Project Verification"
echo "=================================="
echo

# Check Node.js version
echo "✓ Checking Node.js version..."
node --version || { echo "❌ Node.js not found"; exit 1; }

# Check npm version
echo "✓ Checking npm version..."
npm --version || { echo "❌ npm not found"; exit 1; }

# Check directory structure
echo "✓ Checking project structure..."
for dir in backend frontend infrastructure; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir/"
    else
        echo "  ❌ Missing $dir/"
        exit 1
    fi
done

# Check key files
echo "✓ Checking key files..."
key_files=(
    "package.json"
    "README.md"
    "QUICK_START.md"
    "DEPLOYMENT.md"
    "backend/package.json"
    "backend/src/utils/letterMatcher.ts"
    "backend/tests/letterMatcher.test.ts"
    "frontend/package.json"
    "frontend/src/App.tsx"
    "infrastructure/package.json"
    "infrastructure/lib/jottogame-stack.ts"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ Missing $file"
        exit 1
    fi
done

echo
echo "✅ All checks passed!"
echo
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'cd backend && npm test' to verify tests pass"
echo "3. Follow QUICK_START.md or DEPLOYMENT.md to deploy"
echo
