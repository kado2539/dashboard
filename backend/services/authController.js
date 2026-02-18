const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// in-memory online users tracking { userId: lastSeenMs }
const onlineUsers = {};

// cache user table columns
let _userCols = null;
async function getUserCols() {
    if (_userCols) return _userCols;
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM users");
        _userCols = (cols || []).map(c => c.Field);
    } catch (e) {
        _userCols = [];
    }
    return _userCols;
}

async function hasCol(c) { const cols = await getUserCols(); return cols.includes(c); }

const authController = {
    register: async (req, res) => {
        try {
            const { name, email, phone, password } = req.body || {};
            if (!email || !password || !name) return res.status(400).json({ success: false, message: 'Missing fields' });
            const emailCol = await hasCol('email');
            const usernameCol = await hasCol('username');

            // check existing by email or username
            if (emailCol) {
                const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                if (rows && rows.length > 0) return res.status(400).json({ success: false, message: 'Email exists' });
            } else if (usernameCol) {
                const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [email]);
                if (rows && rows.length > 0) return res.status(400).json({ success: false, message: 'Email/username exists' });
            }

            const hashed = await bcrypt.hash(password, 10);
            let userId;
            if (emailCol) {
                const [resIns] = await db.query('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)', [name, email, phone || '', hashed]);
                userId = resIns.insertId;
            } else if (usernameCol) {
                // fallback to username/role schema
                const [resIns] = await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [email, hashed, 'viewer']);
                userId = resIns.insertId;
            } else {
                return res.status(500).json({ success: false, message: 'Users table schema unsupported' });
            }

            const token = jwt.sign({ id: userId, email }, SECRET, { expiresIn: '7d' });
            onlineUsers[userId] = Date.now();
            return res.json({ success: true, token, user: { id: userId, name, email, phone: phone || '' } });
        } catch (err) {
            console.error('Register error', err);
            return res.status(500).json({ success: false, message: 'Register error' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
            const emailCol = await hasCol('email');
            const usernameCol = await hasCol('username');

            // Admin via env
            if (ADMIN_EMAIL && email === ADMIN_EMAIL) {
                if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
                    return res.status(400).json({ success: false, message: 'Invalid admin credentials' });
                }
                // ensure admin exists in DB
                let adminUser;
                if (emailCol) {
                    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [ADMIN_EMAIL]);
                    adminUser = rows && rows[0];
                    if (!adminUser) {
                        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
                        const [r] = await db.query('INSERT INTO users (name, email, phone, password, isAdmin) VALUES (?, ?, ?, ?, ?)', ['Admin', ADMIN_EMAIL, '', hashed, 1]);
                        adminUser = { id: r.insertId, name: 'Admin', email: ADMIN_EMAIL, phone: '', isAdmin: 1 };
                    }
                } else if (usernameCol) {
                    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [ADMIN_EMAIL]);
                    adminUser = rows && rows[0];
                    if (!adminUser) {
                        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
                        const [r] = await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashed, 'admin']);
                        adminUser = { id: r.insertId, username: 'admin', role: 'admin' };
                    }
                }
                const token = jwt.sign({ id: adminUser.id, email: ADMIN_EMAIL, isAdmin: true }, SECRET, { expiresIn: '7d' });
                onlineUsers[adminUser.id] = Date.now();
                return res.json({ success: true, token, user: { id: adminUser.id, name: adminUser.name || adminUser.username || 'Admin', email: adminUser.email || ADMIN_EMAIL, phone: adminUser.phone || '', isAdmin: true } });
            }

            let user;
            if (emailCol) {
                const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                user = rows && rows[0];
            } else if (usernameCol) {
                const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [email]);
                user = rows && rows[0];
                // normalize fields
                if (user) {
                    user.email = user.username;
                    user.name = user.username;
                    user.isAdmin = (user.role === 'admin');
                }
            }

            if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

            const ok = await bcrypt.compare(password, user.password);
            if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials' });

            const token = jwt.sign({ id: user.id, email: user.email, isAdmin: !!user.isAdmin }, SECRET, { expiresIn: '7d' });
            onlineUsers[user.id] = Date.now();
            return res.json({ success: true, token, user: { id: user.id, name: user.name || user.username, email: user.email || user.username, phone: user.phone || '', isAdmin: !!user.isAdmin } });
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
            const emailCol = await hasCol('email');
            const usernameCol = await hasCol('username');
            let user;
            if (emailCol) {
                const [rows] = await db.query('SELECT id, name, email, phone, isAdmin FROM users WHERE id = ?', [decoded.id]);
                user = rows && rows[0];
            } else if (usernameCol) {
                const [rows] = await db.query('SELECT id, username AS name, NULL AS email, NULL AS phone, (role = "admin") AS isAdmin FROM users WHERE id = ?', [decoded.id]);
                user = rows && rows[0];
            }
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            onlineUsers[user.id] = Date.now();
            return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email || '', phone: user.phone || '', isAdmin: !!user.isAdmin } });
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
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
        const user = rows && rows[0];
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields' });

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ success: false, message: 'Current password incorrect' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
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
        const [rows] = await db.query('SELECT id, name, email, phone, isAdmin FROM users');
        return res.json({ success: true, users: rows || [] });
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
        const ids = Object.keys(onlineUsers);
        if (ids.length === 0) return res.json({ success: true, online: [] });
        const [rows] = await db.query(`SELECT id, name, email FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
        const list = ids.map(id => {
            const u = rows.find(x => String(x.id) === String(id));
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
        await db.query('UPDATE users SET isAdmin = ? WHERE id = ?', [isAdmin ? 1 : 0, id]);
        const [rows] = await db.query('SELECT id, name, email, phone, isAdmin FROM users WHERE id = ?', [id]);
        const user = rows && rows[0];
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
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
        const [rows] = await db.query('SELECT id, email FROM users WHERE id = ?', [id]);
        if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        return res.json({ success: true, removed: { id: rows[0].id, email: rows[0].email } });
    } catch (err) {
        console.error('DeleteUser error', err);
        return res.status(500).json({ success: false, message: 'Error' });
    }
};
