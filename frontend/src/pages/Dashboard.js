import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StatusPanel from '../components/StatusPanel';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line
} from 'recharts';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [health, setHealth] = useState(null);

    // fetchData is declared in component scope so Retry button can call it
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('http://localhost:5000/api/stats');
            console.log('API response:', response);
            setData(response.data.data);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message || String(err));
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // fetch health status
    const fetchHealth = async () => {
        try {
            const r = await axios.get('http://localhost:5000/api/health');
            setHealth(r.data);
        } catch (err) {
            console.error('Health check failed', err);
            setHealth({ ok: false, db: false, error: err.message });
        }
    };

    useEffect(() => { fetchHealth(); }, []);

    if (loading) return <div>Loading Dashboard... ⏳</div>;
    if (error) return (
        <div style={{ padding: 20 }}>
            <h2 style={{ color: '#b91c1c' }}>Error loading data</h2>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fff6f6', padding: 12, borderRadius: 8 }}>{error}</pre>
            <div style={{ marginTop: 12 }}>
                <button onClick={() => fetchData()} style={{ padding: '8px 12px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none' }}>Retry</button>
            </div>
            <p style={{ marginTop: 12, color: '#6b7280' }}>Tip: backend is expected at <code>http://localhost:5000/api/stats</code>. Ensure backend is running and CORS is allowed.</p>
        </div>
    );
    if (!data) return <div>No data available</div>;

    return (
        <div className="dashboard-root p-6 min-h-screen">
            <div className="dashboard-header flex items-center justify-between">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">BI Performance Dashboard</h1>
                <StatusPanel initialHealth={health} onRefresh={(h) => setHealth(h)} />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="col-span-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.kpis.map((metric) => {
                            const val = parseFloat(metric.metric_value);
                            const tar = parseFloat(metric.target_value);
                            const isDeclining = val < tar;

                            // map color by performance
                            const valueColor = isDeclining ? '#ef4444' : '#10b981';

                            // synthetic sparkline data when backend doesn't provide history
                            const spark = metric.history && metric.history.length ? metric.history : [
                                { t: 1, v: Math.max(0, val * 0.9) },
                                { t: 2, v: val * 0.95 },
                                { t: 3, v: val },
                                { t: 4, v: val * 1.02 },
                                { t: 5, v: val * 0.98 }
                            ];

                            return (
                                <div key={metric.id} className={`bg-white rounded p-4 shadow flex justify-between items-start kpi-card-anim`}>
                                    <div>
                                        <a href={`/kpi/${metric.id}`} className="text-sm font-semibold text-gray-700 hover:underline">{metric.metric_name}</a>
                                        <div className="mt-2">
                                            <div className="text-xl font-bold" style={{ color: valueColor }}>
                                                {metric.metric_name.includes('Rate') || metric.metric_name.includes('Growth')
                                                    ? `${val}%`
                                                    : `$${val.toLocaleString()}`}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">Target: {tar} | <span className="italic">{metric.status}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div style={{ width: 100, height: 36 }}>
                                            <ResponsiveContainer width={100} height={36}>
                                                <LineChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                    <Line type="monotone" dataKey="v" stroke={valueColor} strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ width: 44, height: 44, borderRadius: 8, background: isDeclining ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                                            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2 10L8 4L12 8L18 2" stroke={valueColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {data.alerts && data.alerts.length > 0 && (
                        <div className="alerts mt-6">
                            <h2 className="text-xl font-bold mb-4 text-red-700">⚠️ Active Alerts</h2>
                            <div className="space-y-3">
                                {data.alerts.map((alert, index) => (
                                    <div key={index} className="alert-item">
                                        <span className={`alert-level ${alert.level}`}>{alert.level}</span>
                                        <p className="text-gray-700 font-medium">{alert.msg}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts section: KPIs and Top Products */}
                    <div className="charts mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="chart-card p-4 bg-white rounded shadow">
                            <h3 className="text-lg font-semibold mb-2">KPIs Overview</h3>
                            <div style={{ width: '100%', height: 240 }}>
                                <ResponsiveContainer>
                                    <BarChart data={data.kpis.map(k => ({ name: k.metric_name, value: Number(k.metric_value) }))}>
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis />
                                        <Tooltip />
                                        {/* Use a richer blue for KPI bars */}
                                        <Bar dataKey="value" fill="#1e40af" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-card p-4 bg-white rounded shadow">
                            <h3 className="text-lg font-semibold mb-2">Top Products (Revenue)</h3>
                            {data.canonicalTopProducts ? (
                                <div>
                                    <div style={{ width: '100%', height: 240 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={data.canonicalTopProducts.map(p => ({ name: p.product_name || p.name || `#${p.id}`, revenue: Number(p.revenue) }))}>
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="revenue" fill="#059669" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ width: '100%', height: 180, marginTop: 12 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={data.canonicalTopProducts.map(p => ({ name: p.product_name || p.name || `#${p.id}`, value: Number(p.revenue) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                                    {data.canonicalTopProducts.map((_, idx) => (
                                                        <Cell key={idx} fill={["#059669", "#2563eb", "#f59e0b", "#ef4444", "#7c3aed"][idx % 5]} />
                                                    ))}
                                                </Pie>
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ width: '100%', height: 240 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={data.topProducts.map(p => ({ name: p.product_name || p.name || `#${p.id}`, revenue: Number(p.revenue) }))}>
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="revenue" fill="#059669" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ width: '100%', height: 180, marginTop: 12 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={data.topProducts.map(p => ({ name: p.product_name || p.name || `#${p.id}`, value: Number(p.revenue) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                                    {data.topProducts.map((_, idx) => (
                                                        <Cell key={idx} fill={["#059669", "#2563eb", "#f59e0b", "#ef4444", "#7c3aed"][idx % 5]} />
                                                    ))}
                                                </Pie>
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;