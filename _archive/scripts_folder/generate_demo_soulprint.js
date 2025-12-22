
const elonAnswersRaw = {
    // PILLAR 1: Communication
    "s1": "25",  // Defend stance (direct, assertive)
    "q1": "They think I'm being difficult when I'm just optimizing for first principles",
    "s2": "15",  // Fast and concise
    "q2": "Processing. Calculating next move. Silence is compute time.",
    "s3": "20",  // Push back

    // PILLAR 2: Emotional Processing  
    "s4": "30",  // Lean toward analytical
    "q3": "Focus on the solution. Emotions are input data, not the algorithm.",
    "s5": "25",  // Process internally
    "q4": "I analyze what went wrong, update the model, move forward. No time for dwelling.",
    "s6": "70",  // Reserved (selective emotional expression)

    // PILLAR 3: Decision Framework
    "s7": "10",  // Immediate/fast decisions
    "q5": "What does physics say? What are the constraints? What's the optimal path? Execute.",
    "s8": "25",  // Lean toward gut/intuition (but informed by data)
    "q6": "When I ignored the data and went with consensus. Never again.",
    "s9": "15",  // Commit fully (all-in mentality)

    // PILLAR 4: Social Boundaries
    "s10": "25", // Selective (small, high-quality circle)
    "q7": "Competence. Ability to execute. Not wasting time. Mission-driven.",
    "s11": "20", // More selective
    "q8": "When they repeatedly fail to deliver or understand first principles thinking.",
    "s12": "30", // Lean toward surface level (efficiency in relationships)

    // PILLAR 5: Cognitive Patterns
    "s13": "15", // Abstract/future (visions of Mars, sustainable energy)
    "q9": "Physics. Mathematics. Engineering. What actually works in reality.",
    "s14": "25", // Structured (engineering mindset)
    "q10": "I break it down to first principles. Build from atomic truths. Everything else is just assumptions.",
    "s15": "20", // Comfort with ambiguity (innovating in uncertain domains)

    // PILLAR 6: Conflict Approach
    "s16": "15", // Direct confrontation
    "q11": "Address it immediately. No point pretending everything's fine when it's not.",
    "s17": "25", // Win/compromise (but strategic)
    "q12": "Not standing my ground on technical truth. Consensus is not reality.",
    "s18": "30"  // Escalate (willing to go public, to extremes for mission)
};

// Map to the full 18-question structure
const mappedAnswers = {
    // Pillar 1
    s1: parseInt(elonAnswersRaw.s1),
    q1: elonAnswersRaw.q1,
    s2: parseInt(elonAnswersRaw.s2),
    q2: elonAnswersRaw.q2,
    s3: parseInt(elonAnswersRaw.s3),
    q3: "I am a builder of the future.", // Filler

    // Pillar 2
    s4: parseInt(elonAnswersRaw.s4),
    q4: elonAnswersRaw.q3, // Map q3 -> q4
    s5: parseInt(elonAnswersRaw.s5),
    q5: elonAnswersRaw.q4, // Map q4 -> q5
    s6: parseInt(elonAnswersRaw.s6),
    q6: "When the rocket exploded, I felt determination, not despair.", // Filler

    // Pillar 3
    s7: parseInt(elonAnswersRaw.s7),
    q7: elonAnswersRaw.q5, // Map q5 -> q7
    s8: parseInt(elonAnswersRaw.s8),
    q8: elonAnswersRaw.q6, // Map q6 -> q8
    s9: parseInt(elonAnswersRaw.s9),
    q9: "Yes, because I am building a future worth living in.", // Filler

    // Pillar 4
    s10: parseInt(elonAnswersRaw.s10),
    q10: elonAnswersRaw.q7, // Map q7 -> q10
    s11: parseInt(elonAnswersRaw.s11),
    q11: elonAnswersRaw.q8, // Map q8 -> q11
    s12: parseInt(elonAnswersRaw.s12),
    q12: "People who are competent and mission-driven.", // Filler

    // Pillar 5
    s13: parseInt(elonAnswersRaw.s13),
    q13: elonAnswersRaw.q9, // Map q9 -> q13
    s14: parseInt(elonAnswersRaw.s14),
    q14: elonAnswersRaw.q10, // Map q10 -> q14
    s15: parseInt(elonAnswersRaw.s15),
    q15: "I learn by doing and iterating rapidly.", // Filler

    // Pillar 6
    s16: parseInt(elonAnswersRaw.s16),
    q16: elonAnswersRaw.q11, // Map q11 -> q16
    s17: parseInt(elonAnswersRaw.s17),
    q17: elonAnswersRaw.q12, // Map q12 -> q17
    s18: parseInt(elonAnswersRaw.s18),
    q18: "I want to be remembered as the one who made humanity multi-planetary." // Filler
};

async function generateSoulPrint() {
    const userId = "demo-user-elon";
    console.log(`Generating SoulPrint for user: ${userId}`);
    console.log("Payload:", JSON.stringify(mappedAnswers, null, 2));

    try {
        const response = await fetch('http://localhost:3000/api/soulprint/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                answers: mappedAnswers
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log("✅ Success! SoulPrint generated.");
        // console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Failed to generate SoulPrint:", error);
    }
}

generateSoulPrint();
