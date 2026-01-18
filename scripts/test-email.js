require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log("Testing Gmail OAuth with parameters:");
    console.log("User:", process.env.GMAIL_USER);
    console.log("Client ID:", process.env.GMAIL_CLIENT_ID ? "Set" : "Missing");
    console.log("Client Secret:", process.env.GMAIL_CLIENT_SECRET ? "Set" : "Missing");
    console.log("Refresh Token:", process.env.GMAIL_REFRESH_TOKEN ? "Set" : "Missing");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        },
    });

    try {
        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"SoulPrint Test" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // Send to self
            subject: "SoulPrint Gmail Integration Test",
            text: "This is a test email to verify the Gmail OAuth integration is working correctly.",
            html: "<h1>Success!</h1><p>Gmail integration is working.</p>",
        });
        console.log("Message sent: %s", info.messageId);
        console.log("Run completed successfully.");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

testEmail();
