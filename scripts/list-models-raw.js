
const apiKey = "AIzaSyCWrnIgpY36Z7uxY-xNglcgrXjjVgBQIAQ";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Error or no models:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

listModels();
