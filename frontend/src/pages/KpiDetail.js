import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

// simple linear regression (least squares) for projection
function linearRegression(points) {
    const n = points.length;
    if (n === 0) return { m: 0, b: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        const x = i; // use index as x
        const y = points[i].value;
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    const denom = (n * sumXX - sumX * sumX) || 1;
    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;
    return { m, b };
}

const KpiDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const projectionMode = location.pathname.endsWith('/projection');

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rangeDays, setRangeDays] = useState(30);
    const [projDays, setProjDays] = useState(14);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const r = await axios.get('http://localhost:5000/api/stats');
                const found = r.data.data.kpis.find(k => String(k.id) === String(id));
                setItem(found || null);
            } catch (err) {
                setItem(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // build or generate historical timeseries for the KPI
    useEffect(() => {
        if (!item) return;

        const fetchHistory = async () => {
            try {
                const r = await axios.get(`http://localhost:5000/api/kpi/${id}/history?days=${rangeDays}`);
                if (r.data && r.data.success && Array.isArray(r.data.history)) {
                    setHistory(r.data.history.map(d => ({ date: d.date, value: Number(d.value) })));
                    return;
                }
            } catch (err) {
                // fallback to item.history or synthetic
            }

            if (item.history && item.history.length) {
                const filtered = item.history.slice(-rangeDays);
                setHistory(filtered.map((d, i) => ({ date: d.date || d.t || String(i), value: Number(d.v ?? d.value ?? 0) })));
                return;
            }

            // fallback synthetic
            const now = Date.now();
            const days = rangeDays;
            const base = Number(item.metric_value) || 0;
            const arr = [];
            for (let i = days - 1; i >= 0; i--) {
                const t = new Date(now - i * 24 * 60 * 60 * 1000);
                const noise = (Math.random() - 0.5) * (Math.abs(base) * 0.02 + 1);
                const value = Math.max(0, base + noise);
                arr.push({ date: t.toISOString().slice(0, 10), value: Number(value.toFixed(2)) });
            }
            setHistory(arr);
        };

        fetchHistory();
    }, [item, rangeDays, id]);

    // calculate simple rolling stddev to display confidence bands
    const seriesWithBand = useMemo(() => {
        if (!history || history.length === 0) return [];
        const window = Math.max(3, Math.floor(history.length * 0.1));
        return history.map((h, idx) => {
            const start = Math.max(0, idx - window + 1);
            const slice = history.slice(start, idx + 1).map(s => s.value);
            const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
            const variance = slice.reduce((a, b) => a + (b - mean) * (b - mean), 0) / slice.length;
            const std = Math.sqrt(variance);
            return { ...h, bandLow: Number((h.value - std * 1.96).toFixed(2)), bandHigh: Number((h.value + std * 1.96).toFixed(2)) };
        });
    }, [history]);

    const regression = useMemo(() => linearRegression(history.map(h => ({ value: Number(h.value) }))), [history]);

    const projected = useMemo(() => {
        if (!history || history.length === 0) return [];
        const n = history.length;
        const points = [];
        for (let i = 1; i <= projDays; i++) {
            const x = n - 1 + i;
            const y = regression.m * x + regression.b;
            const date = new Date(new Date(history[history.length - 1].date).getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            points.push({ date, value: Number(y.toFixed(2)) });
        }
        return points;
    }, [history, projDays, regression]);

    const mergedSeries = useMemo(() => {
        // mark projected points
        return [...history.map(h => ({ ...h, projected: false })), ...projected.map(p => ({ ...p, projected: true }))];
    }, [history, projected]);

    if (loading) return <div className="p-6">Loading...</div>;
    if (!item) return <div className="p-6">KPI not found</div>;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-1">{item.metric_name}</h2>
                    <div className="text-sm text-gray-600">Current: <strong>{item.metric_value}</strong> • Target: {item.target_value} • Status: {item.status}</div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
                    {projectionMode ? (
                        <button className="btn-primary" onClick={() => navigate(`/kpi/${id}`)}>Disable Projection Route</button>
                    ) : (
                        <button className="btn-primary" onClick={() => navigate(`/kpi/${id}/projection`)}>Open Projection Route</button>
                    )}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white p-4 rounded shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <label className="text-sm text-gray-600">Range:</label>
                            <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} className="ml-2 input">
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={90}>90 days</option>
                                <option value={365}>365 days</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Projection horizon:</label>
                            <select value={projDays} onChange={(e) => setProjDays(Number(e.target.value))} className="ml-2 input">
                                <option value={7}>7 days</option>
                                <option value={14}>14 days</option>
                                <option value={30}>30 days</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                            <LineChart data={mergedSeries} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip content={({ active, payload, label }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const main = payload.find(p => p.dataKey === 'value' || p.name === 'value') || payload[0];
                                    const projected = payload.find(p => p.payload && p.payload.projected);
                                    return (
                                        <div style={{ background: '#fff', padding: 8, borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                                            <div style={{ marginTop: 6 }}>Value: <strong>{main?.value ?? main?.payload?.value}</strong></div>
                                            {payload[0].payload && payload[0].payload.bandLow !== undefined && (
                                                <div style={{ fontSize: 12, color: '#6b7280' }}>95% CI: {payload[0].payload.bandLow} — {payload[0].payload.bandHigh}</div>
                                            )}
                                            {projected && <div style={{ fontSize: 12, color: '#ef4444' }}>Projected</div>}
                                        </div>
                                    );
                                }} />
                                <Legend />
                                {/* confidence band as two area-like lines (we'll draw them as hidden lines to access payload) */}
                                <Line type="monotone" dataKey="bandHigh" stroke="rgba(30,64,175,0.0)" dot={false} activeDot={false} />
                                <Line type="monotone" dataKey="bandLow" stroke="rgba(30,64,175,0.0)" dot={false} activeDot={false} />
                                <Line dataKey="value" stroke="#1e40af" dot={false} isAnimationActive={false} strokeWidth={2} />
                                <Line dataKey={(d) => d.projected ? d.value : null} stroke="#ef4444" dot={false} strokeDasharray="4 4" isAnimationActive={false} strokeWidth={2} />
                                {/* render area between bandLow and bandHigh using custom fill via Area would be ideal, but to keep deps minimal we show band values in tooltip */}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p>Latest: <strong>{item.metric_value}</strong></p>
                    <p>Target: {item.target_value}</p>
                    <p>Projected next {projDays} days (trend): <strong>{projected.length ? projected[projected.length - 1].value : '—'}</strong></p>
                    <div className="mt-4">
                        <button className="btn-secondary" onClick={() => {
                            // download csv of history + projection
                            const rows = [['date', 'value', 'projected']].concat(mergedSeries.map(r => [r.date, r.value, r.projected ? '1' : '0']));
                            const csv = rows.map(r => r.join(',')).join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${item.metric_name.replace(/\s+/g, '_')}_series.csv`; a.click();
                            URL.revokeObjectURL(url);
                        }}>Download CSV</button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default KpiDetail;
