// Using native fetch (Node 18+)

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
        if (e.cause) console.error(`  Cause: ${JSON.stringify(e.cause)}`);
        return false;
    }
}

async function verifySystem() {
    console.log(`Starting System Verification against ${BASE_URL}\n`);

    // 1. MONITOR GUARDIAN (Scraper)
    await runTest('Monitor Guardian (/api/inspect)', async () => {
        const res = await fetch(`${BASE_URL}/api/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (!data.metadata || !data.metadata.title) throw new Error('Invalid metadata response');
        if (!data.score) throw new Error('Missing score');
        // Example.com usually has a title "Example Domain"
        if (!data.metadata.title.includes('Example')) throw new Error('Unexpected title');
    });

    // 2. ANALYTICS ENGINE (Setup)
    let newSiteId = null;
    await runTest('Analytics Setup (/api/sites/create)', async () => {
        const res = await fetch(`${BASE_URL}/api/sites/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: 'verify-script-test.com', site_id: `pp_verify_${Date.now()}` })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (!data.success) throw new Error('API reported failure');
        if (!data.site) throw new Error('Missing site object');
        newSiteId = data.site.id;
    });

    // 3. ANALYTICS ENGINE (Tracking)
    await runTest('Analytics Tracking (/api/track)', async () => {
        if (!newSiteId) throw new Error('Skipping: No site ID generated from previous step');

        // Simulate a JSON tracking request
        const res = await fetch(`${BASE_URL}/api/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_id: newSiteId,
                event_type: 'page_view',
                path: '/pricing',
                referrer: 'https://google.com',
                params: { utm_source: 'test-script' }
            })
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error('API reported failure');
    });

    console.log('\nVerification Complete.');
}

verifySystem();
