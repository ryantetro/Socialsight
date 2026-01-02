(function () {
    // Current Script Reference to get data-id
    const currentScript = document.currentScript;
    if (!currentScript) return;

    const siteId = currentScript.getAttribute('data-id');
    if (!siteId) {
        console.warn('PreviewPerfect Pixel: No data-id found.');
        return;
    }

    const getVariant = (key) => {
        if (typeof localStorage === 'undefined') return 'none';
        let v = localStorage.getItem(key);
        if (!v) {
            v = Math.random() > 0.5 ? 'B' : 'A';
            localStorage.setItem(key, v);
        }
        return v;
    };

    const trackPageView = () => {
        // Live Stealth Mode Check
        if (typeof localStorage !== 'undefined' && localStorage.getItem('ss_stealth_mode') === 'true') {
            console.log('SocialSight Pixel: Stealth Mode Active - Page View Tracking Blocked.');
            return;
        }

        const currentAb = getVariant('ss_ab_variant');
        const currentPricing = getVariant('ss_pricing_variant');

        // Sync to window for React app if it loads later
        window.SS_VARIANT = currentAb;
        window.SS_PRICING_VARIANT = currentPricing;

        // Parse Query Params (UTM, Ref)
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }

        const payload = {
            site_id: siteId,
            event_type: 'page_view',
            path: window.location.pathname,
            referrer: document.referrer || null,
            params: {
                ...params,
                ab_variant: currentAb,
                pricing_variant: currentPricing
            }
        };

        // Send to API
        // In production, this URL should be dynamic or hardcoded to your production domain
        // For now, handling relative path if on same domain, or absolute if external
        // Since this script is hosted BY us, we can infer the API root? 
        // Or we just hardcode the production URL for the user. 
        // Users will likely include this from 'https://our-domain.com/pixel.js'

        // Detect host dynamically from script source to avoid CORS/redirect issues
        // We use www.socialsight.dev as the production primary to match your Vercel setup
        let apiHost = "https://www.socialsight.dev";
        if (currentScript.src.includes('localhost')) apiHost = 'http://localhost:3000';

        console.log('SocialSight Pixel: Sending page_view...', payload);

        fetch(`${apiHost}/api/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(err => console.error('PreviewPerfect Pixel Error:', err));
    };

    // Trigger on load
    if (document.readyState === 'complete') {
        trackPageView();
    } else {
        window.addEventListener('load', trackPageView);
    }

    // Capture Clicks
    // Capture Clicks
    document.addEventListener('click', (e) => {
        // Live Stealth Mode Check
        if (typeof localStorage !== 'undefined' && localStorage.getItem('ss_stealth_mode') === 'true') {
            console.log('SocialSight Pixel: Stealth Mode Active - Click Tracking Blocked.');
            return;
        }

        // 1. Check for standard Links
        const link = e.target.closest('a');

        // 2. Check for tracked elements (buttons, divs, etc.)
        const trackedElement = e.target.closest('[data-track]');

        if (!link && !trackedElement) return;

        // Priority to tracked element if both exist (unlikely but possible)
        const target = trackedElement || link;
        const isLink = !!link;

        // If it's a link, ignore internal hash jumps unless explicitly tracked
        if (isLink && !trackedElement && link.hash && link.pathname === window.location.pathname) return;

        // Determine destination/text
        let destination = isLink ? link.href : (target.getAttribute('data-track-dest') || 'internal');

        // If it's a tracked element, use its ID or data-track value as the "destination" or label
        const trackLabel = target.getAttribute('data-track'); // e.g. "hero-cta"
        const trackText = target.innerText || target.getAttribute('aria-label') || 'Unknown';

        const isOutbound = isLink ? (link.hostname !== window.location.hostname) : false;

        // Detect host dynamically from script source to avoid CORS/redirect issues
        // We use www.socialsight.dev as the production primary to match your Vercel setup
        let apiHost = "https://www.socialsight.dev";
        if (currentScript.src.includes('localhost')) apiHost = 'http://localhost:3000';
        const payload = {
            site_id: siteId,
            event_type: 'click',
            path: window.location.pathname,
            referrer: document.referrer || null,
            params: {
                destination: destination,
                text: trackLabel ? `${trackLabel} (${trackText})` : trackText,
                is_outbound: isOutbound,
                is_tracked_element: !!trackedElement,
                ab_variant: window.SS_VARIANT || 'none',
                pricing_variant: window.SS_PRICING_VARIANT || 'none'
            }
        };

        console.log('SocialSight Pixel: Sending click event...', payload);

        // Use sendBeacon for reliability on navigation
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${apiHost}/api/track`, blob);
        } else {
            fetch(`${apiHost}/api/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(console.error);
        }
    });

    // Capture Form Submissions (for Enter key)
    document.addEventListener('submit', (e) => {
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const trackedElement = form.closest('[data-track]') || submitBtn?.closest('[data-track]') || form.querySelector('[data-track]');

        if (!trackedElement) return;

        // Trigger a fake click event or manually call the logic
        // For simplicity, we can just find the tracked button and let the click handler handle it?
        // No, click handler might not trigger on form submit. Let's just send the event.

        const trackLabel = trackedElement.getAttribute('data-track');
        const trackText = trackedElement.innerText || trackedElement.getAttribute('aria-label') || 'Form Submit';

        let apiHost = "https://www.socialsight.dev";
        if (currentScript.src.includes('localhost')) apiHost = 'http://localhost:3000';

        const payload = {
            site_id: siteId,
            event_type: 'click', // We treat it as a click/action for conversion logic
            path: window.location.pathname,
            referrer: document.referrer || null,
            params: {
                destination: 'form_submit',
                text: `${trackLabel} (${trackText})`,
                is_outbound: false,
                is_tracked_element: true,
                ab_variant: window.SS_VARIANT || 'none',
                pricing_variant: window.SS_PRICING_VARIANT || 'none'
            }
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${apiHost}/api/track`, blob);
        } else {
            fetch(`${apiHost}/api/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(console.error);
        }
    });

    // Optional: Handle History Changes for SPAs (Generic simple version)
    // ...
})();
