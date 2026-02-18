import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SettingsPanel = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [pwMessage, setPwMessage] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const r = await axios.get('http://localhost:5000/api/settings');
            setSettings(r.data.settings);
            // fetch current user if token present
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const u = await axios.get('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                    setUser(u.data.user);
                } catch (err) {
                    console.warn('Could not fetch user', err);
                }
            }
        } catch (err) {
            console.error('Load settings error', err);
        } finally {
            setLoading(false);
        }
    };

    const save = async () => {
        setSaving(true);
        setMessage('');
        try {
            const r = await axios.put('http://localhost:5000/api/settings', settings);
            setSettings(r.data.settings);
            setMessage('Saved');
        } catch (err) {
            console.error('Save settings error', err);
            setMessage('Save failed');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return <div>Loading settings...</div>;
    if (!settings) return <div>No settings</div>;

    return (
        <div className="settings-panel card">
            {user && (
                <div style={{ marginBottom: 12 }}>
                    <strong>User:</strong> {user.name} &middot; {user.email} {user.phone && `· ${user.phone}`}
                </div>
            )}
            <h3 className="text-lg font-semibold">Settings</h3>
            <div style={{ marginTop: 8 }}>
                <label className="block text-sm">Alert Email</label>
                <input type="email" value={settings.alertEmail || ''} onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })} className="input" />
            </div>

            <div style={{ marginTop: 8 }}>
                <label className="inline-flex items-center">
                    <input type="checkbox" checked={!!settings.notifyOnNegativeGrowth} onChange={(e) => setSettings({ ...settings, notifyOnNegativeGrowth: e.target.checked })} />
                    <span style={{ marginLeft: 8 }}>Notify on negative sales growth</span>
                </label>
            </div>

            <div style={{ marginTop: 12 }}>
                <button onClick={save} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button>
                {message && <span style={{ marginLeft: 12 }}>{message}</span>}
            </div>

            <div style={{ marginTop: 18 }}>
                <h4 className="text-md font-semibold">Change password</h4>
                <div style={{ marginTop: 8 }}>
                    <input type="password" placeholder="Current password" className="input mb-2 w-full" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <input type="password" placeholder="New password" className="input mb-2 w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <button onClick={async () => {
                        setPwMessage('');
                        try {
                            const token = localStorage.getItem('token');
                            await axios.post('http://localhost:5000/api/auth/change-password', { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
                            setPwMessage('Password changed');
                        } catch (err) {
                            setPwMessage(err.response?.data?.message || 'Error changing password');
                        }
                    }} className="btn-primary">Change Password</button>
                    {pwMessage && <div className="text-sm mt-2">{pwMessage}</div>}
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
