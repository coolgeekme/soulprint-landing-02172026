// Test script for Gemini endpoints

const TEST_API_KEY = 'sk-soulprint-demo-fallback-123456';

async function testGeminiChat() {
    console.log('\\n=== Testing Gemini Chat ===');

    try {
        const response = await fetch('http://localhost:4000/api/gemini/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Hello, tell me about yourself and who I am.' }
                ]
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.choices?.[0]?.message?.content) {
            console.log('\\n✅ Chat working! Response preview:');
            console.log(data.choices[0].message.content.substring(0, 200) + '...');
        }

        if (data.citations) {
            console.log('\\n📚 Citations found:', data.citations.length);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function testSoulPrintSubmit() {
    console.log('\\n=== Testing SoulPrint Submit ===');

    // Sample test answers
    const testAnswers = {
        s1: 65, s2: 40, s3: 55, s4: 70, s5: 45, s6: 60,
        s7: 35, s8: 50, s9: 75, s10: 40, s11: 30, s12: 55,
        s13: 80, s14: 60, s15: 45, s16: 25, s17: 40, s18: 70,
        q1: "People think I'm cold but I'm just focused",
        q2: "Silence is thinking time, not awkwardness",
        q3: "I build things that matter",
        q4: "Vulnerability is hard to show",
        q5: "I need alone time to process",
        q6: "I cried at a movie unexpectedly",
        q7: "I waited too long to start my own company",
        q8: "Risk that I can recover from",
        q9: "Yes, because I've grown from past mistakes",
        q10: "The startup/tech community",
        q11: "Kept work ethic, rejected conformity",
        q12: "People who challenge me intellectually",
        q13: "Doing it myself and failing first",
        q14: "Small talk and meetings without agendas",
        q15: "I research and ask experts",
        q16: "I stay calm and address it logically",
        q17: "I transform conflict into solutions",
        q18: "They'd say I'm direct but fair"
    };

    try {
        const response = await fetch('http://localhost:4000/api/soulprint/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: '4316c8f3-a383-4260-8cbc-daadea2ad142',
                answers: testAnswers
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\\n✅ SoulPrint generated!');
            console.log('Archetype:', data.archetype);
            console.log('Store:', data.store_name);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run tests
(async () => {
    console.log('🧪 Starting Gemini Integration Tests\\n');

    await testGeminiChat();
    // Test SoulPrint generation (takes longer):
    await testSoulPrintSubmit();

    console.log('\\n✅ Tests complete!');
})();
