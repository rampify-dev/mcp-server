# MCP Server Quick Start Guide

## Prerequisites

1. **Backend API running** at http://localhost:3000
2. **At least one site added** to the dashboard
3. **Cursor or Claude Code** installed

## Setup (5 minutes)

### Step 1: Build the MCP Server

```bash
cd /path/to/rampify/packages/mcp-server
npm install
npm run build
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
BACKEND_API_URL=http://localhost:3000
LOG_LEVEL=debug  # For testing
```

### Step 3: Configure Cursor

Add to Cursor settings (Settings → Extensions → MCP):

```json
{
  "mcpServers": {
    "rampify": {
      "command": "node",
      "args": [
        "/path/to/rampify/packages/mcp-server/build/index.js"
      ],
      "env": {
        "BACKEND_API_URL": "http://localhost:3000",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Or manually add to:** `~/.cursor/mcp.json` or `~/.config/Code/User/settings.json`

### Step 4: Restart Cursor

Quit and restart Cursor completely for MCP changes to take effect.

---

## Testing

### Test 1: Get SEO Context

Open any file in Cursor and ask:

```
What's the SEO status of example.com?
```

or

```
Give me SEO insights for this page at example.com/blog/post
```

**Expected response:**
- Performance metrics (clicks, impressions, CTR, position)
- Top keywords
- Detected issues
- Recommendations

---

### Test 2: Scan Site

Ask Cursor:

```
Scan example.com for SEO issues
```

or

```
What are the critical SEO problems on example.com?
```

**Expected response:**
- Health score and grade
- Issue summary by severity
- Detailed list of issues
- Recommended actions

---

## Troubleshooting

### "MCP server not found"

**Check:**
1. Did you build? (`npm run build`)
2. Is the path correct in Cursor settings?
3. Did you restart Cursor?

**Debug:** Check Cursor logs (Help → Toggle Developer Tools → Console)

---

### "No client found for domain"

**Solution:** Add the site in the dashboard first:

```bash
cd /path/to/rampify
npm run dev
```

Then go to http://localhost:3000 and add your domain.

---

### "Connection refused"

**Check:**
1. Is the backend running? (`npm run dev` in root directory)
2. Is it running on port 3000?
3. Check `BACKEND_API_URL` in `.env`

---

### Empty or stale data

**Run site analysis first:**

1. Go to http://localhost:3000
2. Click on your site
3. Click "Analyze Site"
4. Wait for completion
5. Try MCP tools again

---

## Debugging

### View MCP Server Logs

The MCP server logs to stderr, which Cursor captures.

To see logs:
1. Open Cursor
2. Help → Toggle Developer Tools
3. Console tab
4. Look for `[SEO Intelligence MCP]` messages

### Test Without Cursor

You can test the MCP server directly:

```bash
cd packages/mcp-server
npm run dev
```

Then send JSON-RPC requests via stdin (advanced).

---

## Example Queries

### Get SEO Context

```
Ask: "What's the SEO performance of example.com/blog?"
```

```
Ask: "Show me keyword rankings for this page"
```

### Scan Site

```
Ask: "Scan example.com for critical issues only"
```

```
Ask: "What are the top 10 SEO problems on my site?"
```

### Combined

```
Ask: "Scan example.com and show me the 5 quickest wins"
```

---

## Next Steps

Once basic tools are working:

1. **Add GSC connection** in dashboard for real traffic data
2. **Test with multiple domains**
3. **Implement remaining tools** (generate_meta, check_before_deploy, suggest_links)
4. **Write documentation** for each tool
5. **Create demo video**

---

## Configuration Options

### Cache TTL

Control how long responses are cached:

```bash
CACHE_TTL=3600  # 1 hour (default)
CACHE_TTL=1800  # 30 minutes
CACHE_TTL=0     # Disable caching
```

### Log Levels

```bash
LOG_LEVEL=debug  # All logs (for development)
LOG_LEVEL=info   # Info and above (default)
LOG_LEVEL=warn   # Warnings and errors only
LOG_LEVEL=error  # Errors only
```

---

## Performance Tips

1. **Use caching** - Results are cached for 1 hour by default
2. **Limit scan results** - Use filters to reduce response size
3. **Run analysis offline** - Trigger site analysis in dashboard, not via MCP

---

## Support

- **Issues:** https://github.com/rampify/mcp-server/issues
- **Documentation:** https://www.rampify.dev/docs/mcp-server
- **Main README:** [README.md](../README.md)

Happy testing! 🚀
