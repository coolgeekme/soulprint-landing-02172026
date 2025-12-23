/**
 * Test Script: Direct Ollama Connection
 * Verifies that Hermes 3 is running and responding.
 */

const OLLAMA_URL = 'http://localhost:11434/api/chat';

async function testOllama() {
    console.log('🚀 Testing Ollama Connection...');
    
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'hermes3',
                messages: [
                    { role: 'user', content: 'Hello! Are you ready to be a SoulPrint Mirror?' }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Success! Response from Hermes 3:');
        console.log('---------------------------------------------------');
        console.log(data.message.content);
        console.log('---------------------------------------------------');
        console.log('Your local AI is ready for the SoulPrint integration.');

    } catch (error) {
        console.error('❌ Failed to connect to Ollama.');
        console.error('Make sure Ollama is running and you have pulled the model:');
        console.error('Run: ollama serve');
        console.error('Run: ollama pull hermes3');
        console.error('Error details:', error.message);
    }
}

testOllama();
