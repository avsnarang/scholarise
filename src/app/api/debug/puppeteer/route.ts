import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting Puppeteer diagnostic...');
    
    // Check if Puppeteer can launch at all
    console.log('📦 Puppeteer version:', require('puppeteer/package.json').version);
    console.log('🌐 Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    console.log('🚀 Attempting to launch browser...');
    
    const isVercel = !!process.env.VERCEL;
    
    const browser = await puppeteer.launch({
      args: isVercel ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: isVercel ? await chromium.executablePath() : process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: isVercel ? chromium.headless : true,
    });
    
    console.log('✅ Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('✅ New page created');
    
    // Test basic HTML rendering
    await page.setContent('<html><body><h1>Test PDF Generation</h1><p>This is a test.</p></body></html>');
    console.log('✅ HTML content set');
    
    // Test PDF generation
    const pdfBuffer = await page.pdf({
      width: '8.27in',
      height: '5.83in',
      printBackground: true,
      margin: {
        top: '0.3in',
        right: '0.3in',
        bottom: '0.3in',
        left: '0.3in'
      }
    });
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    console.log('✅ Browser closed');
    
    return NextResponse.json({
      success: true,
      message: 'Puppeteer is working correctly',
      pdfSize: pdfBuffer.length,
      puppeteerVersion: require('puppeteer/package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'unknown',
      isVercel: !!process.env.VERCEL,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      executablePath: isVercel ? 'Vercel Chromium' : (process.env.PUPPETEER_EXECUTABLE_PATH || 'default'),
      chromiumArgs: isVercel ? chromium.args.length + ' Vercel-optimized args' : 'Local args'
    });
    
  } catch (error) {
    console.error('❌ Puppeteer diagnostic failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env.NODE_ENV || 'unknown',
      puppeteerVersion: require('puppeteer/package.json').version,
      isVercel: !!process.env.VERCEL,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      executablePath: !!process.env.VERCEL ? 'Vercel Chromium' : (process.env.PUPPETEER_EXECUTABLE_PATH || 'default')
    }, { status: 500 });
  }
}
