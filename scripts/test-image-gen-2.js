
const apiKey = "AIzaSyCWrnIgpY36Z7uxY-xNglcgrXjjVgBQIAQ";
// Trying standard Imagen 3 endpoint this time
const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;

async function generateImage() {
    const payload = {
        instances: [
            {
                prompt: "A futuristic professional social media preview image for a tech startup, high quality, 1200x630"
            }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9"
        }
    };

    try {
        console.log("Testing Imagen 3.0...");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.predictions) {
            console.log("Success! Received prediction/image data.");
            console.log("Image B64 Length:", data.predictions[0].bytesBase64Encoded?.length);
        } else {
            console.log("Error:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

generateImage();
