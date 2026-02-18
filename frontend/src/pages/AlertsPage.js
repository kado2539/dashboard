import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AlertsPage = () => {
    const [alerts, setAlerts] = useState([]);

    const loadAlerts = async () => {
        try {
            const r = await axios.get('http://localhost:5000/api/stats');
            const a = (r.data && r.data.data && r.data.data.alerts) || [];
            setAlerts(a);
        } catch (err) {
            console.error('Load alerts error', err);
            setAlerts([]);
        }
    };

    useEffect(() => { loadAlerts(); }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Active Alerts</h1>
            {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                    {alerts.map((a, idx) => (
                        <div key={idx} className="alert-item">
                            <span className={`alert-level ${a.level}`}>{a.level}</span>
                            <p className="text-gray-700 font-medium">{a.msg}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div>No active alerts</div>
            )}
        </div>
    );
};

export default AlertsPage;
