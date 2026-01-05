const https = require('https');
const fs = require('fs');

const options = {
    hostname: 'www.streak.com',
    path: '/api/v1/pipelines/agxzfm1haWxmb29nYWVyNQsSDE9yZ2FuaXphdGlvbiIOYXJjaGVmb3JnZS5jb20MCxIIV29ya2Zsb3cYgIClntjvsAoM',
    method: 'GET',
    auth: 'strk_LitL1WFFkGdFSuTpHRQDNYIZQ2l:',
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        fs.writeFileSync('pipeline.json', data);
        console.log('Pipeline data saved to pipeline.json');
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
