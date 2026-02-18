import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [online, setOnline] = useState([]);
    const [table, setTable] = useState('dashboard_metrics');
    const [row, setRow] = useState('{}');
    const [msg, setMsg] = useState('');

    const loadUsers = async () => {
        try { const r = await axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setUsers(r.data.users || []); } catch (err) { setUsers([]); }
    };
    const loadOnline = async () => {
        try { const r = await axios.get('http://localhost:5000/api/admin/online', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setOnline(r.data.online || []); } catch (err) { setOnline([]); }
    };

    useEffect(() => { loadUsers(); loadOnline(); }, []);

    const insert = async () => {
        try {
            const parsed = JSON.parse(row);
            const r = await axios.post('http://localhost:5000/api/admin/insert', { table, row: parsed }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setMsg(r.data.message || 'Inserted');
            loadUsers();
        } catch (err) {
            console.error(err);
            setMsg('Insert failed');
        }
    };

    const toggleAdmin = async (id, value) => {
        try {
            await axios.put('http://localhost:5000/api/admin/user', { id, isAdmin: value }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            loadUsers();
        } catch (err) { console.error(err); }
    };

    const deleteUser = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/admin/user/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            loadUsers();
        } catch (err) { console.error(err); }
    };

    // settings editor
    const [settings, setSettings] = useState(null);
    const loadSettings = async () => {
        try {
            const r = await axios.get('http://localhost:5000/api/settings', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setSettings(r.data.settings || {});
        } catch (err) { setSettings(null); }
    };
    useEffect(() => { loadSettings(); }, []);

    const saveSettings = async () => {
        try {
            const r = await axios.put('http://localhost:5000/api/settings', settings, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setMsg('Settings saved');
            setSettings(r.data.settings || settings);
        } catch (err) { setMsg('Save failed'); }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

            <section className="mb-6">
                <h2 className="font-semibold">Registered users</h2>
                <div className="mt-2">
                    {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 border-b">
                            <div>{u.name} ({u.email})</div>
                            <div>
                                <label style={{ marginRight: 8 }}>Admin</label>
                                <input type="checkbox" checked={!!u.isAdmin} onChange={(e) => toggleAdmin(u.id, e.target.checked)} />
                                <button style={{ marginLeft: 8 }} onClick={() => deleteUser(u.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="font-semibold">Online users</h2>
                <div className="mt-2">
                    {online.map(o => (
                        <div key={o.id}>{o.user ? o.user.name : o.id} - lastSeen: {o.lastSeen}</div>
                    ))}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="font-semibold">Insert data (allowed tables)</h2>
                <div className="mt-2">
                    <select value={table} onChange={(e) => setTable(e.target.value)}>
                        <option value="dashboard_metrics">dashboard_metrics</option>
                        <option value="top_products">top_products</option>
                    </select>
                    <textarea value={row} onChange={(e) => setRow(e.target.value)} rows={6} style={{ width: '100%', marginTop: 8 }} />
                    <div style={{ marginTop: 8 }}>
                        <button onClick={insert} className="btn-primary">Insert</button>
                        <span style={{ marginLeft: 12 }}>{msg}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Enter JSON object with columns and values, e.g. {`{"metric_name":"Sales","metric_value":1000,"target_value":1200}`}</p>
                </div>
            </section>

            <section className="mb-6">
                <h2 className="font-semibold">Business thresholds / Settings</h2>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block' }}>Alert Email</label>
                        <input style={{ width: '100%' }} value={settings?.alertEmail || ''} onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block' }}>Notify on Negative Growth</label>
                        <input type="checkbox" checked={!!settings?.notifyOnNegativeGrowth} onChange={(e) => setSettings({ ...settings, notifyOnNegativeGrowth: e.target.checked })} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block' }}>Business thresholds (JSON)</label>
                        <textarea rows={6} style={{ width: '100%' }} value={JSON.stringify(settings?.thresholds || {}, null, 2)} onChange={(e) => {
                            try { const parsed = JSON.parse(e.target.value); setSettings({ ...settings, thresholds: parsed }); } catch (err) { /* ignore invalid */ }
                        }} />
                    </div>
                    <div>
                        <button onClick={saveSettings} className="btn-primary">Save Settings</button>
                        <span style={{ marginLeft: 12 }}>{msg}</span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminPanel;
