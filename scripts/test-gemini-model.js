
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    const models = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "gemini-1.0-pro"
    ];

    for (const modelName of models) {
        try {
            console.log(`\nTesting ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            console.log(`SUCCESS: ${modelName} works! Response:`, result.response.text());
            return; // Exit on first success
        } catch (e) {
            console.log(`FAILED ${modelName}:`, e.message.split('\n')[0]);
            // Log just the first line to keep it clean
            if (e.message.includes("429")) console.log("  -> Quota error (Authentication worked)");
            if (e.message.includes("404")) console.log("  -> Model not found");
        }
    }
}

run();
