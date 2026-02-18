import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(12);
    const [total, setTotal] = useState(0);
    const [minRevenue, setMinRevenue] = useState('');
    const [skuFilter, setSkuFilter] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const params = { q: debouncedQuery, page, pageSize };
                if (minRevenue) params.minRevenue = Number(minRevenue);
                if (skuFilter) params.q = skuFilter; // prioritize SKU when provided
                const r = await axios.get('http://localhost:5000/api/products', { params });
                const list = r.data.products || [];
                setProducts(list || []);
                setTotal(r.data.meta?.total || list.length);
            } catch (err) {
                // final fallback to /api/stats
                try {
                    const s = await axios.get('http://localhost:5000/api/stats');
                    setProducts(s.data?.data?.topProducts || []);
                    setTotal((s.data?.data?.topProducts || []).length);
                } catch (e) {
                    setProducts([]);
                    setTotal(0);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [debouncedQuery, page, pageSize, minRevenue, skuFilter]);

    // debounce query input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 350);
        return () => clearTimeout(t);
    }, [query]);

    if (loading) return <div className="p-6">Loading products...</div>;

    const fmtCurrency = (v) => {
        if (v === undefined || v === null || v === '') return '—';
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    };

    const fmtNumber = (v) => {
        if (v === undefined || v === null || v === '') return '—';
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return n.toLocaleString();
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Products & Sales</h2>
            <div className="flex items-center gap-3">
                <input placeholder="Search products..." className="input" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                <input placeholder="Min revenue" className="input" style={{ width: 140 }} value={minRevenue} onChange={(e) => { setMinRevenue(e.target.value); setPage(1); }} />
                <input placeholder="SKU filter" className="input" style={{ width: 160 }} value={skuFilter} onChange={(e) => { setSkuFilter(e.target.value); setPage(1); }} />
                <div className="text-sm text-gray-600">Results: {total}</div>
            </div>

            {products.length === 0 && (
                <div className="text-gray-600 mt-4">No products found.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {products.map((p, idx) => {
                    const name = p.product_name || p.name || p.title || `#${p.id || p.product_id || idx}`;
                    const revenue = p.revenue || p.sales || p.total_sales || p.price || p.retail_price;
                    const units = p.units_sold || p.quantity || p.stock || p.sold || p.count;
                    return (
                        <Link key={p.id || p.product_id || idx} to={`/product/${p.id || p.product_id || idx}`} className="block bg-white p-4 rounded shadow hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{name}</h3>
                                <div className="text-sm text-gray-500">{fmtCurrency(revenue)}</div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600">Units sold: {fmtNumber(units)}</div>
                            <div className="mt-3 text-xs text-gray-500">SKU: {p.sku || p.product_sku || '—'}</div>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">Page {page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
                    <button className="btn-primary" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / pageSize)}>Next</button>
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;
