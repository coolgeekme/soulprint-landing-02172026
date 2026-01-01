import { NextResponse } from 'next/server';

// Streak Configuration
const STREAK_API_KEY = 'strk_LitL1WFFkGdFSuTpHRQDNYIZQ2l';
const PIPELINE_KEY = 'agxzfm1haWxmb29nYWVyNQsSDE9yZ2FuaXphdGlvbiIOYXJjaGVmb3JnZS5jb20MCxIIV29ya2Zsb3cYgIClntjvsAoM';
const STAGE_KEY_LEAD_COLLECTED = '5001';

// Field Keys from your pipeline.json
const FIELD_KEYS = {
    ROLE: '1001',
    AFFILIATION: '1002'
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, role, organization } = body;

        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and Email are required' },
                { status: 400 }
            );
        }

        // 1. Create the Box
        const createBoxResponse = await fetch(
            `https://www.streak.com/api/v1/pipelines/${PIPELINE_KEY}/boxes`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${btoa(STREAK_API_KEY + ':')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    name: name,
                    stageKey: STAGE_KEY_LEAD_COLLECTED
                })
            }
        );

        if (!createBoxResponse.ok) {
            const errorText = await createBoxResponse.text();
            console.error('Streak Create Box Error:', errorText);
            throw new Error(`Failed to create box: ${createBoxResponse.statusText}`);
        }

        const box = await createBoxResponse.json();
        const boxKey = box.key;

        // 2. Update Fields (Role & Affiliation)
        // We can do this in parallel
        const fieldUpdates = [];

        if (role) {
            fieldUpdates.push(
                fetch(
                    `https://www.streak.com/api/v1/boxes/${boxKey}/fields/${FIELD_KEYS.ROLE}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${btoa(STREAK_API_KEY + ':')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ value: role })
                    }
                )
            );
        }

        if (organization) {
            fieldUpdates.push(
                fetch(
                    `https://www.streak.com/api/v1/boxes/${boxKey}/fields/${FIELD_KEYS.AFFILIATION}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${btoa(STREAK_API_KEY + ':')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ value: organization })
                    }
                )
            );
        }

        // 3. Add Email as a Comment/Note
        // Because contacts are complex in Streak, adding a note with the email is the most reliable way to capture it initially.
        const noteContent = `Lead Contact Info:\nEmail: ${email}\nName: ${name}\nRole: ${role || 'N/A'}\nOrg: ${organization || 'N/A'}\n\nSubmitted via Website Waitlist`;

        fieldUpdates.push(
            fetch(
                `https://www.streak.com/api/v1/boxes/${boxKey}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${btoa(STREAK_API_KEY + ':')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        message: noteContent
                    })
                }
            )
        );

        await Promise.all(fieldUpdates);

        return NextResponse.json({ success: true, boxKey });
    } catch (error) {
        console.error('Waitlist Submission Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
