import React, { useState } from 'react';
import axios from 'axios';

const StatusPanel = ({ initialHealth, onRefresh }) => {
    const [health, setHealth] = useState(initialHealth || null);
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const r = await axios.get('http://localhost:5000/api/health');
            setHealth(r.data);
            if (onRefresh) onRefresh(r.data);
        } catch (err) {
            setHealth({ ok: false, db: false, error: err.message || String(err) });
            if (onRefresh) onRefresh({ ok: false });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="status-panel card">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Global App Status</h3>
                    <p className="text-sm text-gray-600">Last check: {health && health.checkedAt ? health.checkedAt : '—'}</p>
                </div>
                <div>
                    <button onClick={refresh} className="btn-primary">{loading ? 'Checking...' : 'Refresh'}</button>
                </div>
            </div>

            <div style={{ marginTop: 12 }}>
                <div>Status: {health ? (health.ok ? <span style={{ color: 'green' }}>OK</span> : <span style={{ color: 'red' }}>DOWN</span>) : 'Unknown'}</div>
                <div>DB: {health ? (health.db ? 'Available' : 'Unavailable') : '—'}</div>
                {health && health.error && <div className="text-red-600">Error: {health.error}</div>}
            </div>
        </div>
    );
};

export default StatusPanel;
