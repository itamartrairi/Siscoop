const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('Page loaded successfully.'); await page.screenshot({path: 'screenshot.png'});
    
    // Check if body has content
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if (bodyHTML.includes('SICOOP PLATFORM') || bodyHTML.trim() === '<div id="root"></div>') {
       console.log('Root might be empty. Length:', bodyHTML.length);
       console.log('Root HTML:', await page.evaluate(() => document.getElementById('root').innerHTML));
    }

  } catch (e) {
    console.error('Failed to navigate:', e.message);
  }

  await browser.close();
})();
