# Fixing Puppeteer on Vercel Production

## 🚀 **VERCEL-SPECIFIC SOLUTION IMPLEMENTED!**

✅ **Your code has been updated with Vercel-compatible Chromium!**

The following changes have been made:
- ✅ Added `@sparticuz/chromium` package (Vercel-optimized)
- ✅ Updated PDF generation to use Vercel-compatible browser
- ✅ Added automatic environment detection (Vercel vs Local)
- ✅ Created `vercel.json` with optimal function configuration
- ✅ Enhanced diagnostic endpoint for Vercel

## 🔍 Step 1: Test After Deployment

Deploy your updated code and test:

```bash
# Test the diagnostic endpoint on Vercel
curl "https://scholarise.tsh.edu.in/api/debug/puppeteer" | jq .
```

## 🔧 Step 2: Common Fixes

### Option A: Ubuntu/Debian Server
```bash
# Install Chrome dependencies
sudo apt update
sudo apt install -y \
  chromium-browser \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libgtk-3-0 \
  libgtk-4-1 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils

# Set executable path (add to your .env)
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Option B: CentOS/RHEL/Rocky Linux
```bash
# Install Chrome dependencies
sudo yum install -y \
  chromium \
  liberation-fonts \
  vulkan-loader

# Set executable path
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Option C: Docker/Container Solution
Add to your Dockerfile:
```dockerfile
# Install Chrome
RUN apt-get update && apt-get install -y \
  chromium-browser \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libgtk-3-0 \
  libgtk-4-1 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils

# Set executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 🔧 Step 3: Environment Variables

Add to your production `.env`:
```bash
# Tell Puppeteer where to find Chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Skip Puppeteer download during npm install (use system Chrome)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## 🚀 Step 4: Alternative Solutions

### Option 1: Use Playwright (More Reliable)
```bash
npm install playwright
npx playwright install chromium
```

### Option 2: Use PDF Service (Cloud)
Consider using a cloud PDF service like:
- Puppeteer as a Service
- HTMLtoPDF API
- PDFShift

### Option 3: Serverless Functions
Move PDF generation to:
- Vercel Functions
- AWS Lambda
- Cloudflare Workers

## 🧪 Step 5: Test Again

After fixes:
```bash
# Test Puppeteer diagnostic
curl "https://scholarise.tsh.edu.in/api/debug/puppeteer" | jq .

# Test actual PDF generation
curl "https://scholarise.tsh.edu.in/api/receipts/TSHPS%2FFIN%2F2025-26%2F000009/pdf" -I
```

## 🔍 Step 6: Check Server Logs

Look for error details in your server logs:
```bash
# Check for Puppeteer-specific errors
tail -f /var/log/your-app.log | grep -i puppeteer
```

## 📞 Quick Fix Commands

```bash
# Ubuntu Quick Fix
sudo apt update && sudo apt install -y chromium-browser
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env

# Restart your application
pm2 restart all  # or your restart command
```

## 💡 Pro Tips

1. **Check server resources**: Puppeteer needs ~100MB RAM per browser instance
2. **Verify file permissions**: Make sure your app can execute Chrome
3. **Test locally first**: Always verify the fix works locally before deploying
4. **Monitor memory usage**: PDF generation can be memory-intensive

## 🆘 If Still Failing

If none of the above work, the issue might be:
- Memory constraints (upgrade server)
- Security policies (SELinux, AppArmor)
- Network restrictions (firewall blocking Chrome)
- Container runtime issues (Docker security)
