const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

async function listModels() {
    console.log('🔑 Using API Key:', env.GEMINI_API_KEY ? 'Found' : 'Missing');
    
    try {
        const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        // The method to list models might vary depending on the SDK version
        // Try the standard way for @google/generative-ai first, but this is @google/genai
        
        // If it's the new SDK, it might be different.
        // Let's try to inspect the object
        console.log('SDK Methods:', Object.keys(genAI));
        
        if (genAI.listModels) {
             const models = await genAI.listModels();
             console.log('Models:', models);
        } else if (genAI.models && genAI.models.list) {
             const models = await genAI.models.list();
             console.log('Models:', models);
        } else {
            console.log('Could not find listModels method. Trying to generate with gemini-1.5-flash directly...');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello");
            console.log('Generation result:', result.response.text());
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

listModels();
