(function () {
    // Current Script Reference to get data-id
    const currentScript = document.currentScript;
    if (!currentScript) return;

    const siteId = currentScript.getAttribute('data-id');
    if (!siteId) {
        console.warn('PreviewPerfect Pixel: No data-id found.');
        return;
    }

    // Capture Page View
    const trackPageView = () => {
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
            params: params // Send all params
        };

        // Send to API
        // In production, this URL should be dynamic or hardcoded to your production domain
        // For now, handling relative path if on same domain, or absolute if external
        // Since this script is hosted BY us, we can infer the API root? 
        // Or we just hardcode the production URL for the user. 
        // Users will likely include this from 'https://our-domain.com/pixel.js'

        // Dynamic host determination (assuming pixel is served from the same domain as API)
        const apiHost = new URL(currentScript.src).origin;

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

    // Optional: Handle History Changes for SPAs (Generic simple version)
    // ...
})();
