const BASE_URL = 'http://localhost:3000';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runTest(name, fn) {
    process.stdout.write(`Testing ${name}... `);
    try {
        await fn();
        console.log(`${GREEN}PASSED${RESET}`);
        return true;
    } catch (e) {
        console.log(`${RED}FAILED${RESET}`);
        console.error(`  Error: ${e.message}`);
        return false;
    }
}

async function simulateProduction() {
    console.log(`🚀 Starting Production Simulation against ${BASE_URL}\n`);

    // 1. Verify /pixel.js for Hardcoded URL
    await runTest('Pixel Script Content (/pixel.js)', async () => {
        const res = await fetch(`${BASE_URL}/pixel.js`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const text = await res.json(); // Wait, pixel.js is a script, not JSON
    });

    // Fixing step 1 logic:
    await runTest('Pixel Script (Hardcoded URL check)', async () => {
        const res = await fetch(`${BASE_URL}/pixel.js`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const code = await res.text();
        if (!code.includes('https://socialsight.dev')) {
            throw new Error('Hardcoded production URL not found in pixel.js');
        }
    });

    // 2. Verify /api/track for CORS Headers
    await runTest('Tracking API CORS (/api/track)', async () => {
        const res = await fetch(`${BASE_URL}/api/track`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://some-other-domain.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        if (!res.ok && res.status !== 204) throw new Error(`Status ${res.status}`);

        const allowOrigin = res.headers.get('access-control-allow-origin');
        if (allowOrigin !== '*') throw new Error(`Incorrect CORS origin: ${allowOrigin}`);

        const allowMethods = res.headers.get('access-control-allow-methods');
        if (!allowMethods || !allowMethods.includes('POST')) throw new Error('POST method not allowed in CORS');
    });

    // 3. Verify Tracking Logic
    await runTest('Tracking Functional Test', async () => {
        const res = await fetch(`${BASE_URL}/api/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_id: 'pp_verify_test',
                event_type: 'page_view',
                path: '/test-simulation',
                referrer: 'https://twitter.com'
            })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error('API reported failure');
    });

    // 4. Verify Screenshot API (The fix for the Chromium error)
    await runTest('Screenshot API Fix (/api/screenshot)', async () => {
        console.log('\n  (This might take a few seconds...)');
        const res = await fetch(`${BASE_URL}/api/screenshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`Status ${res.status}: ${errorData.message || 'Unknown error'}`);
        }

        const contentType = res.headers.get('content-type');
        if (contentType !== 'image/png') throw new Error(`Unexpected content type: ${contentType}`);

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength < 1000) throw new Error('Screenshot image too small, likely failed');
    });

    console.log('\n✅ Production Simulation Complete.');
}

simulateProduction();
