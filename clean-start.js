const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up development environment...\n');

// 1. Kill Node/Next.js processes
try {
    console.log('💀 Killing Node processes...');
    execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'inherit' });
} catch (e) {
    console.log('   (No Node processes to kill)');
}

// 2. Remove lock file
const lockFile = path.join(__dirname, '.next', 'dev', 'lock');
if (fs.existsSync(lockFile)) {
    console.log('🔓 Removing lock file...');
    try {
        fs.unlinkSync(lockFile);
        console.log('   ✓ Lock removed');
    } catch (e) {
        console.log('   ⚠️ Could not remove lock (it might be in use)');
    }
} else {
    console.log('🔓 No lock file found (good!)');
}

console.log('\n✨ Environment clean! Starting server...');
console.log('─'.repeat(50) + '\n');

try {
    execSync('npm run dev', { stdio: 'inherit' });
} catch (e) {
    // User cancelled or error
    process.exit(e.status || 1);
}
