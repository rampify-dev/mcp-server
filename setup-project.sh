#!/bin/bash

# Setup script to configure SEO Intelligence MCP server for a project
# Usage: ./setup-project.sh <domain> [project-path]

if [ -z "$1" ]; then
  echo "Usage: ./setup-project.sh <domain> [project-path]"
  echo "Example: ./setup-project.sh example.com /path/to/my-project"
  exit 1
fi

DOMAIN=$1
PROJECT_PATH=${2:-$(pwd)}
# Update this path to where you cloned the MCP server
MCP_SERVER_PATH="$(cd "$(dirname "$0")" && pwd)/build/index.js"

echo "📦 Setting up SEO Intelligence MCP server for domain: $DOMAIN"
echo "📁 Project path: $PROJECT_PATH"

# Navigate to project directory
cd "$PROJECT_PATH" || exit 1

# Add project-scoped MCP server
claude mcp add --scope local seo-intelligence "node" "$MCP_SERVER_PATH" \
  -e BACKEND_API_URL=http://localhost:3000 \
  -e SEO_CLIENT_DOMAIN="$DOMAIN" \
  -e LOG_LEVEL=info

if [ $? -eq 0 ]; then
  echo "✅ MCP server configured successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Reload your IDE window (Cmd+Shift+P -> 'Developer: Reload Window')"
  echo "2. Make sure the dashboard is running: npm run dev"
  echo "3. Add '$DOMAIN' as a client in the dashboard if not already added"
  echo "4. Run analysis on the client"
  echo "5. Use MCP tools without specifying domain:"
  echo "   - get_seo_context (no domain param needed)"
  echo "   - scan_site (no domain param needed)"
else
  echo "❌ Failed to configure MCP server"
  exit 1
fi
