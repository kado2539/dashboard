const fs = require('fs');
const path = require('path');
const db = require('../database/connection');

async function run() {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        const usersFile = path.join(dataDir, 'users.json');
        if (!fs.existsSync(usersFile)) {
            console.log('No users.json found, nothing to migrate.');
            process.exit(0);
        }

        const raw = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(raw || '[]');
        if (!Array.isArray(users) || users.length === 0) {
            console.log('users.json empty, nothing to migrate.');
            process.exit(0);
        }

        let migrated = 0;
        for (const u of users) {
            const email = u.email;
            if (!email) continue;
            // check exists
            const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (rows && rows.length > 0) continue;
            // insert (assumes passwords in file are already hashed)
            const password = u.password || '';
            const name = u.name || '';
            const phone = u.phone || '';
            const isAdmin = u.isAdmin ? 1 : 0;
            await db.query('INSERT INTO users (name, email, phone, password, isAdmin) VALUES (?, ?, ?, ?, ?)', [name, email, phone, password, isAdmin]);
            migrated++;
        }

        console.log(`Migration complete. ${migrated} users inserted.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration error', err);
        process.exit(1);
    }
}

run();
