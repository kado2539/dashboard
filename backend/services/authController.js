const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

const SECRET = process.env.JWT_SECRET || 'dev_secret';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// in-memory online users tracking { userId: lastSeenMs }
const onlineUsers = {};

const readUsers = () => JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
const writeUsers = (u) => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));

const authController = {
    register: async (req, res) => {
        try {
            const { name, email, phone, password } = req.body || {};
            if (!email || !password || !name) return res.status(400).json({ success: false, message: 'Missing fields' });

            const users = readUsers();
            if (users.find(u => u.email === email)) return res.status(400).json({ success: false, message: 'Email exists' });

            const hashed = await bcrypt.hash(password, 10);
            const user = { id: Date.now(), name, email, phone, password: hashed };
            users.push(user);
            writeUsers(users);

            const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
            // mark online
            onlineUsers[user.id] = Date.now();
            return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
        } catch (err) {
            console.error('Register error', err);
            return res.status(500).json({ success: false, message: 'Register error' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
            const users = readUsers();

            // Admin login via env credentials
            if (ADMIN_EMAIL && email === ADMIN_EMAIL) {
                if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
                    return res.status(400).json({ success: false, message: 'Invalid admin credentials' });
                }
                // ensure admin user exists in store
                let adminUser = users.find(u => u.email === ADMIN_EMAIL);
                if (!adminUser) {
                    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
                    adminUser = { id: Date.now(), name: 'Admin', email: ADMIN_EMAIL, phone: '', password: hashed, isAdmin: true };
                    users.push(adminUser);
                    writeUsers(users);
                }
                const token = jwt.sign({ id: adminUser.id, email: adminUser.email, isAdmin: true }, SECRET, { expiresIn: '7d' });
                onlineUsers[adminUser.id] = Date.now();
                return res.json({ success: true, token, user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, phone: adminUser.phone, isAdmin: true } });
            }

            const user = users.find(u => u.email === email);
            if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

            const ok = await bcrypt.compare(password, user.password);
            if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials' });

            const token = jwt.sign({ id: user.id, email: user.email, isAdmin: !!user.isAdmin }, SECRET, { expiresIn: '7d' });
            onlineUsers[user.id] = Date.now();
            return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, isAdmin: !!user.isAdmin } });
        } catch (err) {
            console.error('Login error', err);
            return res.status(500).json({ success: false, message: 'Login error' });
        }
    },

    me: async (req, res) => {
        try {
            const auth = req.headers.authorization || '';
            const token = auth.replace(/^Bearer\s+/, '');
            if (!token) return res.status(401).json({ success: false, message: 'No token' });
            const decoded = jwt.verify(token, SECRET);
            const users = readUsers();
            const user = users.find(u => u.id === decoded.id);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            // update online timestamp
            onlineUsers[user.id] = Date.now();
            return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, isAdmin: !!user.isAdmin } });
        } catch (err) {
            console.error('Me error', err);
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
    }
};

// Add change password (requires Authorization header)
authController.changePassword = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        const users = readUsers();
        const user = users.find(u => u.id === decoded.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields' });

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ success: false, message: 'Current password incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        writeUsers(users);
        return res.json({ success: true, message: 'Password changed' });
    } catch (err) {
        console.error('Change password error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = authController;

// Admin endpoints (helper functions attached to same controller)
authController.listUsers = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' });
        const users = readUsers();
        const out = users.map(u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, isAdmin: !!u.isAdmin }));
        return res.json({ success: true, users: out });
    } catch (err) {
        console.error('ListUsers error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};

authController.listOnline = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' });
        // return user ids with lastSeen and user info if available
        const users = readUsers();
        const list = Object.keys(onlineUsers).map(id => {
            const u = users.find(x => String(x.id) === String(id));
            return { id, lastSeen: new Date(onlineUsers[id]).toISOString(), user: u ? { id: u.id, name: u.name, email: u.email } : null };
        });
        return res.json({ success: true, online: list });
    } catch (err) {
        console.error('ListOnline error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};

// Insert row into allowed tables (admin only). Expects { table: string, row: { col: value } }
authController.adminInsert = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' });

        const db = require('../database/connection');
        const { table, row } = req.body || {};
        const allowed = ['dashboard_metrics', 'top_products'];
        if (!table || !row || !allowed.includes(table)) return res.status(400).json({ success: false, message: 'Invalid table or row' });

        // Query columns and filter
        const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
        const colNames = cols.map(c => c.Field);
        const insertCols = Object.keys(row).filter(c => colNames.includes(c));
        if (insertCols.length === 0) return res.status(400).json({ success: false, message: 'No valid columns' });
        const placeholders = insertCols.map(() => '?').join(',');
        const values = insertCols.map(c => row[c]);
        const sql = `INSERT INTO \`${table}\` (${insertCols.join(',')}) VALUES (${placeholders})`;
        await db.query(sql, values);
        return res.json({ success: true, message: 'Row inserted' });
    } catch (err) {
        console.error('AdminInsert error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};

// Update user (admin only). Body: { id, isAdmin }
authController.updateUser = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' });

        const { id, isAdmin } = req.body || {};
        if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
        const users = readUsers();
        const user = users.find(u => String(u.id) === String(id));
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.isAdmin = !!isAdmin;
        writeUsers(users);
        return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.isAdmin } });
    } catch (err) {
        console.error('UpdateUser error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};

// Delete user (admin only)
authController.deleteUser = async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/, '');
        if (!token) return res.status(401).json({ success: false, message: 'No token' });
        const decoded = jwt.verify(token, SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin only' });

        const id = req.params.id;
        if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
        const users = readUsers();
        const idx = users.findIndex(u => String(u.id) === String(id));
        if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });
        const removed = users.splice(idx, 1)[0];
        writeUsers(users);
        return res.json({ success: true, removed: { id: removed.id, email: removed.email } });
    } catch (err) {
        console.error('DeleteUser error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};
