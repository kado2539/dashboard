import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [ma7, setMa7] = useState([]);
    const [ma30, setMa30] = useState([]);
    const [showMA7, setShowMA7] = useState(() => searchParams.get('ma7') !== '0');
    const [showMA30, setShowMA30] = useState(() => searchParams.get('ma30') !== '0');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const p = await axios.get(`http://localhost:5000/api/product/${id}`);
                if (p.data && p.data.success) setProduct(p.data.product || null);
            } catch (err) {
                // ignore
            }

            try {
                const a = await axios.get(`http://localhost:5000/api/product/${id}/analytics?days=90`);
                if (a.data && a.data.success) {
                    setHistory(a.data.history || []);
                    setAvgPrice(a.data.avgPrice || null);
                    setMa7(a.data.ma7 || []);
                    setMa30(a.data.ma30 || []);
                }
            } catch (err) {
                // fallback to history-only endpoint if analytics missing
                try {
                    const h = await axios.get(`http://localhost:5000/api/product/${id}/history?days=90`);
                    if (h.data && h.data.success) setHistory(h.data.history || []);
                } catch (err2) {
                    setHistory([]);
                }
            }

            setLoading(false);
        };
        load();
    }, [id]);

    const [avgPrice, setAvgPrice] = useState(null);


    // backend provides ma7/ma30; local fallback could be computed here if needed

    useEffect(() => {
        const params = Object.fromEntries([...searchParams]);
        // keep ma7/ma30 in search params so toggles are shareable
        if (showMA7) params.ma7 = '1'; else params.ma7 = '0';
        if (showMA30) params.ma30 = '1'; else params.ma30 = '0';
        setSearchParams(params, { replace: true });
    }, [showMA7, showMA30]);

    if (loading) return <div className="p-6">Loading product...</div>;
    if (!product) return <div className="p-6">Product not found</div>;

    // fallback compute MA arrays on client if backend didn't provide them
    const computeMA = (arr, window) => {
        if (!arr || arr.length === 0) return [];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
            const start = Math.max(0, i - window + 1);
            const slice = arr.slice(start, i + 1).map(x => Number(x.value || x.v || 0));
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            res.push({ date: arr[i].date, value: Number(avg.toFixed(2)) });
        }
        return res;
    };

    const ma7Fallback = ma7 && ma7.length ? ma7 : computeMA(history, 7);
    const ma30Fallback = ma30 && ma30.length ? ma30 : computeMA(history, 30);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{product.product_name || product.name || `#${product.id || product.product_id}`}</h2>
                    <div className="text-sm text-gray-600">Price: {product.price || product.retail_price || product.revenue}</div>
                </div>
                <div>
                    <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>

            <div className="mt-6 bg-white p-4 rounded shadow">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold mb-3">Sales (last 90 days)</h3>
                    <div className="flex items-center gap-3">
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ width: 10, height: 10, background: '#059669', display: 'inline-block', borderRadius: 4 }} /> <small>Sales</small>
                            <span style={{ width: 10, height: 10, background: '#2563eb', display: 'inline-block', borderRadius: 4, marginLeft: 8 }} /> <small>MA7</small>
                            <span style={{ width: 10, height: 10, background: '#f59e0b', display: 'inline-block', borderRadius: 4, marginLeft: 8 }} /> <small>MA30</small>
                        </div>
                        <div>
                            <label style={{ marginRight: 8 }}><input type="checkbox" checked={showMA7} onChange={(e) => setShowMA7(e.target.checked)} /> MA7</label>
                            <label style={{ marginLeft: 8 }}><input type="checkbox" checked={showMA30} onChange={(e) => setShowMA30(e.target.checked)} /> MA30</label>
                        </div>
                    </div>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value, name) => [value, name === 'value' ? 'Sales' : name]} />
                            <Line dataKey="value" stroke="#059669" dot={false} name="Sales" />
                            {showMA7 && ma7 && ma7.length > 0 && <Line data={ma7} dataKey="value" stroke="#2563eb" dot={false} name="MA (7)" />}
                            {showMA30 && ma30 && ma30.length > 0 && <Line data={ma30} dataKey="value" stroke="#f59e0b" dot={false} name="MA (30)" />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold">Details</h4>
                    <pre className="text-xs bg-gray-50 p-3 rounded">{JSON.stringify(product, null, 2)}</pre>
                </div>
                <div>
                    <h4 className="font-semibold">SKU Comparison</h4>
                    <div className="p-3 bg-gray-50 rounded">
                        <div>Product price: <strong>{product.price || product.retail_price || product.revenue || '—'}</strong></div>
                        <div>Average price (catalog): <strong>{avgPrice ? avgPrice.toFixed(2) : '—'}</strong></div>
                        <div className="mt-2">
                            {avgPrice ? (
                                <div>
                                    {(() => {
                                        const prodPrice = Number(product.price || product.retail_price || 0);
                                        const pct = ((prodPrice - avgPrice) / (avgPrice || 1) * 100);
                                        const cls = pct > 0 ? { color: '#16a34a' } : (pct < 0 ? { color: '#dc2626' } : {});
                                        return (
                                            <div>
                                                <div>Difference: <strong style={cls}>{pct.toFixed(1)}%</strong></div>
                                                <div className="text-sm text-gray-600">Positive means above catalog average.</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : <div className="text-sm text-gray-600">No catalog data to compare.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
