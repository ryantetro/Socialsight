
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
// Note: The model list showed 'nano-banana-pro-preview' and 'imagen-4.0'. 
// Let's try 'imagen-3.0-generate-001' first as it's standard, if not we try nano.
// Actually let's try the specific one from the list: 'nano-banana-pro-preview'

const urlNano = `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:predict?key=${apiKey}`;

async function generateImage() {
    const payload = {
        instances: [
            {
                prompt: "A futuristic professional social media preview image for a tech startup, high quality, 1200x630"
            }
        ],
        parameters: {
            sampleCount: 1
        }
    };

    try {
        console.log("Testing Nano Banana...");
        const response = await fetch(urlNano, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.predictions) {
            console.log("Success! Received prediction/image data.");
            // Just log length to verify
            console.log("Image B64 Length:", data.predictions[0].bytesBase64Encoded?.length);
        } else {
            console.log("Error:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

generateImage();
