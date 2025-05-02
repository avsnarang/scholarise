#!/bin/bash

# This script helps you migrate content from Pages Router to App Router
# It opens both the source and destination files side by side for easier migration

# Usage: ./scripts/migrate-content.sh [path]
# Example: ./scripts/migrate-content.sh students/create

# Ensure path is provided
if [ -z "$1" ]; then
  echo "Please provide a path to migrate"
  echo "Usage: ./scripts/migrate-content.sh [path]"
  echo "Example: ./scripts/migrate-content.sh students/create"
  exit 1
fi

# Determine paths
path=$1
src_file="src/pages/${path}.tsx"
index_file="src/pages/${path}/index.tsx"
dest_file="src/app/${path}/page.tsx"
layout_file="src/app/${path}/layout.tsx"

# Check if source file exists
if [ -f "$src_file" ]; then
  SRC_FILE=$src_file
elif [ -f "$index_file" ]; then
  SRC_FILE=$index_file
else
  echo "Source file not found at either:"
  echo "- $src_file"
  echo "- $index_file"
  exit 1
fi

# Check if destination file exists
if [ ! -f "$dest_file" ]; then
  echo "Destination file not found: $dest_file"
  exit 1
fi

# Determine editor to use
if command -v code &> /dev/null; then
  # Use VS Code if available
  code -r $SRC_FILE $dest_file $layout_file
elif command -v vim &> /dev/null; then
  # Use Vim if available
  vim -O $SRC_FILE $dest_file $layout_file
else
  # Fall back to displaying the files
  echo "Source file ($SRC_FILE):"
  echo "----------------------------------------"
  head -n 30 $SRC_FILE
  echo "... [truncated] ..."
  echo ""
  echo "Destination file ($dest_file):"
  echo "----------------------------------------"
  cat $dest_file
  echo ""
  echo "Layout file ($layout_file):"
  echo "----------------------------------------"
  cat $layout_file
fi

echo ""
echo "Migration process:"
echo "1. Copy/modify the content from $SRC_FILE to $dest_file"
echo "2. Update the layout in $layout_file with proper title/description"
echo "3. Test the App Router implementation"
echo ""
echo "Once all pages are migrated, run:"
echo "node scripts/cleanup-pages-router.js"
echo "to safely remove the old Pages Router files" 