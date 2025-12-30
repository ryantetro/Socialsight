
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyCWrnIgpY36Z7uxY-xNglcgrXjjVgBQIAQ");

async function run() {
    const modelName = "gemini-2.0-flash-exp-image-generation";

    try {
        console.log(`Testing ${modelName} with generateContent...`);
        // Note: Image gen usually requires specific prompting or tools, but let's try direct prompt
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent("Generate an image of a futuristic robot");
        console.log("Response structure:", JSON.stringify(result, null, 2));

        // Check for inline data (images)
        // result.response.candidates[0].content.parts[0].inlineData
    } catch (error) {
        console.log("Error:", error.message);
    }
}

run();
