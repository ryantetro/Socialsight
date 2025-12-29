const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting verification script...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);

    let currentMockTier = null; // If null, don't mock (use real DB for initial signup)

    page.on('request', request => {
        if (currentMockTier && request.url().includes('rest/v1/profiles') && request.method() === 'GET') {
            console.log(`[Mock] Intercepting Profile Fetch. Injecting tier: ${currentMockTier}`);
            request.respond({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'mock-id', // This might mismatch with auth user id, hopefully the app doesn't strict check in the UI rendering part aside from useProfile logic
                    tier: currentMockTier,
                    email: 'mock@example.com'
                })
            });
        } else {
            request.continue();
        }
    });

    try {
        // 1. Test Sign Up
        console.log('1. Testing Sign Up / Login Flow...');
        const email = `test-${Date.now()}@example.com`;
        const password = 'password123';

        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

        // Check if we are on login page
        // Assuming generic Supabase auth form or custom form.
        // Let's log the content to be sure if selectors fail.

        // Look for email input
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);

        // Look for "Sign Up" button. It might be "Sign In" with a toggle.
        // Based on conversations, user "redesigned auth flow... standard Email/Password".
        // I will try to click a button that contains "Sign Up" or "Create Account".
        // Or if it's a dual form, I might need to toggle.

        const maxRetries = 3;
        let signedUp = false;

        // Try to find a sign up button
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.toLowerCase().includes('sign up')) {
                await btn.click();
                signedUp = true;
                break;
            }
        }

        if (!signedUp) {
            // Maybe it's "Sign in" and leads to sign up? Or it's a "Sign Up" link?
            // Let's assume standard behavior: type creds, click generic submit.
            await page.keyboard.press('Enter');
        }

        // Wait for navigation to dashboard/home
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => console.log("Navigation timeout or already there"));

        console.log('Sign up/Login submitted. Checking current url...');
        console.log('Current URL:', page.url());

        if (page.url().includes('/login')) {
            console.error('Failed to leave login page. Check auth flow.');
            // Might be a "Check email for confirmation" flow if Supabase requires it.
            // If so, we can't easily proceed.
            // But usually dev mode disable confirm.
        }

        // 2. Validate Free Tier (Real or Mocked)
        console.log('2. Validating Free Tier...');
        // We are likely logged in as a new user -> Free tier.
        // Check for "Unlock Pro" or similar.

        // Wait for main content
        await page.waitForSelector('main');
        const content = await page.content();

        if (content.includes('Unlock Pro') || content.includes('Get Pro')) {
            console.log('✅ Free Tier detected (Upgrade options visible)');
        } else {
            console.warn('⚠️ Free Tier element not found. Might be unexpected content.');
        }

        // 3. Test Paid Tiers via Mocking
        // We need to reload to trigger the `useProfile` fetch again with our mock.

        // TEST: Founder / Pro
        currentMockTier = 'pro';
        console.log('3. Validating Pro Tier (Mocked)...');

        // We must ensure the interceptor works. useProfile depends on valid Auth session.
        // If the auth session is valid, it calls `fetchProfile`.

        await page.reload({ waitUntil: 'networkidle0' });

        // Wait for the UI to settle
        await new Promise(r => setTimeout(r, 2000));

        const proContent = await page.content();
        // Pro should have "Fix Issues" instead of "Unlock"
        // And "Competitor Benchmarking" should be unlocked?

        // Logic in page.tsx:
        // !isPaid -> "Get Pro"
        // isPaid -> "PlanPill"

        if (proContent.includes('Fix Issues')) {
            console.log('✅ Pro Tier detected (Fix Issues button visible)');
        } else {
            console.log('❌ Pro Tier validation failed. UI did not update as expected.');
        }

        // TEST: Growth
        currentMockTier = 'growth';
        console.log('4. Validating Growth Tier (Mocked)...');

        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));

        const growthContent = await page.content();
        // Growth has "Analytics" unlocked. 
        // Button: setActiveTab('analytics')
        // LockedFeature checks `canAnalyze`.

        // Check if the "Analytics" tab works or if the locked feature is gone.
        // The tabs are always visible if `result` is present.
        // Wait, `result` (scraper result) must be present for tabs to show!
        // If we just loaded the page, `result` is null.
        // So we need to perform a SCRAPE first to see the tabs.

        console.log('Performing a scrape to enable tabs...');
        // Find input
        await page.type('input[type="url"]', 'https://example.com'); // search input
        await page.keyboard.press('Enter');

        // Wait for result
        // The scraper might take time.
        await new Promise(r => setTimeout(r, 5000));

        // Now tabs should be visible.
        // We are in Growth tier.
        // Check if Analytics is locked.
        // LockedFeature usually has label "Unlock Analytics..."

        // Let's click "Analytics" tab
        const analyticsBtn = await page.$('button[class*="PieChart"]'); // loosely finding button with icon
        // Actually the button text is "Analytics"

        const buttons2 = await page.$$('button');
        for (const btn of buttons2) {
            const txt = await page.evaluate(el => el.textContent, btn);
            if (txt.includes('Analytics')) {
                await btn.click();
                break;
            }
        }

        await new Promise(r => setTimeout(r, 1000));
        const finalContent = await page.content();

        if (finalContent.includes('Unlock Analytics')) {
            console.log('❌ Growth Tier validation failed. Analytics is still locked.');
        } else {
            console.log('✅ Growth Tier detected. Analytics unlocked.');
        }

    } catch (e) {
        console.error('Script Failed:', e);
    } finally {
        await browser.close();
    }
})();
