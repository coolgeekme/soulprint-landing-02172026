const { google } = require('googleapis');
const readline = require('readline');

console.log('--- Google OAuth2 Refresh Token Generator ---');
console.log('You will need your Client ID and Client Secret from the Google Cloud Console.');
console.log('Ensure you have enabled the Gmail API for your project.');
console.log('');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter your Client ID: ', (clientId) => {
    rl.question('Enter your Client Secret: ', (clientSecret) => {

        const oauth2Client = new google.auth.OAuth2(
            clientId.trim(),
            clientSecret.trim(),
            'https://developers.google.com/oauthplayground' // Redirect URI
        );

        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://mail.google.com/',
            prompt: 'consent'
        });

        console.log('\nPlease visit the following URL in your browser to authorize the app:');
        console.log(authorizeUrl);
        console.log('\nAfter authorizing, you will be redirected to the OAuth Playground.');
        console.log('Copy the "Authorization code" and paste it below.');

        rl.question('\nEnter the authorization code: ', async (code) => {
            try {
                const { tokens } = await oauth2Client.getToken(code.trim());

                console.log('\n--- SUCCESS! ---');
                console.log('Here is your new Refresh Token:');
                console.log('\x1b[32m%s\x1b[0m', tokens.refresh_token);

            } catch (error) {
                console.error('\nError retrieving access token:', error.message);
            } finally {
                rl.close();
            }
        });
    });
});
