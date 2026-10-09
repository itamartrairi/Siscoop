import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
      console.log('PAGE LOG ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    console.log('Navigating to local dev server...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
    console.log('Page loaded');
    
    // Check if we are on login page
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('Login form found, filling...');
      await page.type('input[type="email"]', 'admin@siscoope.com.br');
      await page.type('input[type="password"]', '123456');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), // Sometimes it doesn't navigate but just updates DOM
        page.click('button[type="submit"]')
      ]);
      console.log('Login submitted');
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log('Checking for errors...');
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();
