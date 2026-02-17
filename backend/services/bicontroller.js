// 1. Add this at the VERY TOP of biController.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use an App Password, not your real password
    }
});

// 2. Add this inside your getDashboardData function, after the loop:
// Database connection
const db = require('../database/connection');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
// ensure settings exists
if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ alertEmail: '', notifyOnNegativeGrowth: true }, null, 2));
}

const biController = {
    getDashboardData: async (req, res) => {
        try {
            // 1. Fetch all metrics and top products from HeidiSQL
            const [metrics] = await db.query('SELECT * FROM dashboard_metrics');
            const [topProducts] = await db.query('SELECT * FROM top_products ORDER BY revenue DESC');

            // 2. Logic-based Alert System (Matches your specific requirements)
            const alerts = [];
            metrics.forEach(m => {
                const value = parseFloat(m.metric_value);
                const target = parseFloat(m.target_value);

                if (m.metric_name === 'Net Profit' && value < target) {
                    alerts.push({ level: 'High', msg: `Net Profit ($${value}) is below target ($${target})` });
                }
                if (m.metric_name === 'Sales Growth' && value < 0) {
                    alerts.push({ level: 'Critical', msg: `Sales Growth is negative: ${value}%` });
                }
                if (m.metric_name === 'Conversion Rate' && value < 2.0) {
                    alerts.push({ level: 'Medium', msg: `Low Conversion Rate: ${value}% (Target: 2%)` });
                }
            });

            res.status(200).json({
                success: true,
                data: { kpis: metrics, topProducts, alerts }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Database Error" });
        }
    }
    ,
    // Simple health endpoint — verifies DB connectivity and returns status
    healthCheck: async (req, res) => {
        try {
            // run a lightweight query
            await db.query('SELECT 1');
            res.status(200).json({ ok: true, db: true });
        } catch (error) {
            console.error('Health check DB error:', error);
            res.status(500).json({ ok: false, db: false, error: error.message });
        }
    }
    ,
    // Return a generated report for a specific date (YYYY-MM-DD). If missing, fallback to current metrics.
    getReport: async (req, res) => {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const filePath = path.join(REPORTS_DIR, `report-${date}.json`);
        try {
            if (fs.existsSync(filePath)) {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return res.json({ success: true, report: content });
            }

            // fallback: produce a live snapshot
            const [metrics] = await db.query('SELECT * FROM dashboard_metrics');
            const [topProducts] = await db.query('SELECT * FROM top_products ORDER BY revenue DESC');
            const report = { date, generatedAt: new Date().toISOString(), metrics, topProducts };
            return res.json({ success: true, report });
        } catch (error) {
            console.error('GetReport error:', error);
            return res.status(500).json({ success: false, message: 'Report Error' });
        }
    }
    ,
    // Return a short history of generated reports by reading the reports folder
    getReportHistory: async (req, res) => {
        try {
            const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('report-') && f.endsWith('.json'));
            // sort descending (newest first)
            files.sort((a, b) => fs.statSync(path.join(REPORTS_DIR, b)).mtimeMs - fs.statSync(path.join(REPORTS_DIR, a)).mtimeMs);
            const history = files.slice(0, 10).map(f => {
                const full = path.join(REPORTS_DIR, f);
                try {
                    const content = JSON.parse(fs.readFileSync(full, 'utf8'));
                    return { date: content.date || f.replace(/report-|.json/g, ''), generatedAt: content.generatedAt || fs.statSync(full).mtime.toISOString(), path: `/reports/${f}` };
                } catch (err) {
                    return { date: f.replace(/report-|.json/g, ''), generatedAt: fs.statSync(full).mtime.toISOString(), path: `/reports/${f}` };
                }
            });
            return res.json({ success: true, history });
        } catch (error) {
            console.error('GetReportHistory error:', error);
            return res.status(500).json({ success: false, message: 'History Error' });
        }
    }
    ,
    // Generate and save a report for a given date (or today if none provided)
    generateReport: async (req, res) => {
        const date = (req.body && req.body.date) ? req.body.date : new Date().toISOString().slice(0, 10);
        const filePath = path.join(REPORTS_DIR, `report-${date}.json`);
        try {
            const [metrics] = await db.query('SELECT * FROM dashboard_metrics');
            const [topProducts] = await db.query('SELECT * FROM top_products ORDER BY revenue DESC');
            const report = { date, generatedAt: new Date().toISOString(), metrics, topProducts };
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
            return res.json({ success: true, message: 'Report generated', path: `/reports/report-${date}.json` });
        } catch (error) {
            console.error('GenerateReport error:', error);
            return res.status(500).json({ success: false, message: 'Generate Error' });
        }
    }
    ,
    // Settings endpoints
    getSettings: async (req, res) => {
        try {
            const content = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            return res.json({ success: true, settings: content });
        } catch (error) {
            console.error('GetSettings error:', error);
            return res.status(500).json({ success: false, message: 'Settings Error' });
        }
    }
    ,
    updateSettings: async (req, res) => {
        try {
            const incoming = req.body || {};
            const current = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            const updated = { ...current, ...incoming };
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
            return res.json({ success: true, settings: updated });
        } catch (error) {
            console.error('UpdateSettings error:', error);
            return res.status(500).json({ success: false, message: 'Update Settings Error' });
        }
    }
    ,
    // KPI history endpoint: returns time series for a KPI by id. Tries to read a dedicated history table then falls back to synthetic series
    getKpiHistory: async (req, res) => {
        const id = req.params.id;
        const days = Number(req.query.days) || 90;
        try {
            // try history table first
            try {
                const [rows] = await db.query('SELECT `date`, `value` FROM dashboard_metrics_history WHERE metric_id = ? ORDER BY `date` ASC LIMIT ?', [id, days]);
                if (rows && rows.length) return res.json({ success: true, history: rows });
            } catch (inner) {
                // table may not exist; fall through to synthetic
            }

            const [[metric]] = await db.query('SELECT * FROM dashboard_metrics WHERE id = ? LIMIT 1', [id]);
            if (!metric) return res.status(404).json({ success: false, message: 'KPI not found' });

            // synthetic generation around current value
            const base = Number(metric.metric_value) || 0;
            const now = Date.now();
            const arr = [];
            for (let i = days - 1; i >= 0; i--) {
                const t = new Date(now - i * 24 * 60 * 60 * 1000);
                const noise = (Math.random() - 0.5) * (Math.abs(base) * 0.02 + 1);
                const value = Math.max(0, base + noise);
                arr.push({ date: t.toISOString().slice(0, 10), value: Number(value.toFixed(2)) });
            }
            return res.json({ success: true, history: arr });
        } catch (error) {
            console.error('GetKpiHistory error:', error);
            return res.status(500).json({ success: false, message: 'History Error' });
        }
    }
    ,
    // List products endpoint: tries 'products' table then fallback to 'top_products'
    listProducts: async (req, res) => {
        // Query params: q (search), page, pageSize, minRevenue, sku
        const q = (req.query.q || '').trim();
        const sku = (req.query.sku || '').trim();
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(200, Math.max(5, Number(req.query.pageSize) || 20));
        const offset = (page - 1) * pageSize;
        const minRevenue = Number(req.query.minRevenue) || 0;

        try {
            // Prefer products table with search/paging
            try {
                let where = 'WHERE 1=1';
                const params = [];
                if (sku) { where += ' AND (sku = ?)'; params.push(sku); }
                else if (q) { where += ' AND (product_name LIKE ? OR sku LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
                if (minRevenue > 0) { where += ' AND (price >= ?)'; params.push(minRevenue); }

                const [rows] = await db.query(`SELECT SQL_CALC_FOUND_ROWS * FROM products ${where} ORDER BY product_name ASC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
                const [[{ 'FOUND_ROWS()': total }]] = await db.query('SELECT FOUND_ROWS()');
                // mark exact SKU matches
                if (sku && rows && rows.length) rows = rows.map(r => ({ ...r, matchedBy: 'sku' }));
                return res.json({ success: true, products: rows, meta: { total: Number(total), page, pageSize } });
            } catch (inner) {
                // products table may not exist, fall back
            }

            // fallback: query top_products with optional filters
            let sql = 'SELECT * FROM top_products';
            const args = [];
            if (sku) { sql += ' WHERE sku = ?'; args.push(sku); }
            else if (q) { sql += ' WHERE product_name LIKE ?'; args.push(`%${q}%`); }
            sql += ' ORDER BY revenue DESC LIMIT ? OFFSET ?';
            const [top] = await db.query(sql, [...args, pageSize, offset]);
            // annotate matchedBy for fallback
            const annotated = top.map(t => ({ ...t, matchedBy: sku ? 'sku' : (q ? 'query' : 'none') }));
            return res.json({ success: true, products: annotated, meta: { total: top.length, page, pageSize } });
        } catch (error) {
            console.error('ListProducts error:', error);
            return res.status(500).json({ success: false, message: 'Products Error' });
        }
    }
    ,
    // Product sales history: tries products_sales table, then falls back to synthetic series from revenue
    getProductHistory: async (req, res) => {
        const id = req.params.id;
        const days = Number(req.query.days) || 90;
        try {
            try {
                const [rows] = await db.query('SELECT `date`, `sales` as value FROM products_sales WHERE product_id = ? ORDER BY `date` ASC LIMIT ?', [id, days]);
                if (rows && rows.length) return res.json({ success: true, history: rows });
            } catch (inner) {
                // table may not exist; fall through
            }

            // try to fetch product from products or top_products
            let product = null;
            try {
                const [pRows] = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
                if (pRows && pRows.length) product = pRows[0];
            } catch (ignore) { }
            if (!product) {
                const [tRows] = await db.query('SELECT * FROM top_products WHERE id = ? LIMIT 1', [id]);
                if (tRows && tRows.length) product = tRows[0];
            }

            if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

            const base = Number(product.revenue || product.price || 0);
            const now = Date.now();
            const arr = [];
            for (let i = days - 1; i >= 0; i--) {
                const t = new Date(now - i * 24 * 60 * 60 * 1000);
                const noise = (Math.random() - 0.5) * (Math.abs(base) * 0.05 + 1);
                const value = Math.max(0, Math.round((base / 30) + noise));
                arr.push({ date: t.toISOString().slice(0, 10), value });
            }
            return res.json({ success: true, history: arr });
        } catch (error) {
            console.error('GetProductHistory error:', error);
            return res.status(500).json({ success: false, message: 'Product History Error' });
        }
    }
    ,
    // Product analytics: compute moving averages and catalog comparisons
    getProductAnalytics: async (req, res) => {
        const id = req.params.id;
        const days = Number(req.query.days) || 90;
        try {
            // fetch sales history (prefer products_sales)
            let history = [];
            try {
                const [rows] = await db.query('SELECT `date`, `sales` as value FROM products_sales WHERE product_id = ? ORDER BY `date` ASC LIMIT ?', [id, days]);
                if (rows && rows.length) history = rows;
            } catch (inner) { /* ignore */ }

            // fallback to generated history if none
            if (!history || history.length === 0) {
                const ph = await biController.getProductHistory({ params: { id }, query: { days } }, { json: () => { } });
                // since getProductHistory uses res.json directly, just regenerate here quickly
                // simple synthetic generation similar to getProductHistory
                let product = null;
                try {
                    const [pRows] = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
                    if (pRows && pRows.length) product = pRows[0];
                } catch (ignore) { }
                if (!product) {
                    const [tRows] = await db.query('SELECT * FROM top_products WHERE id = ? LIMIT 1', [id]);
                    if (tRows && tRows.length) product = tRows[0];
                }
                const base = Number(product?.revenue || product?.price || 0);
                const now = Date.now();
                for (let i = days - 1; i >= 0; i--) {
                    const t = new Date(now - i * 24 * 60 * 60 * 1000);
                    const noise = (Math.random() - 0.5) * (Math.abs(base) * 0.05 + 1);
                    const value = Math.max(0, Math.round((base / 30) + noise));
                    history.push({ date: t.toISOString().slice(0, 10), value });
                }
            }

            // moving average helper
            const movingAverage = (arr, window) => {
                if (!arr || arr.length === 0) return [];
                const res = [];
                for (let i = 0; i < arr.length; i++) {
                    const start = Math.max(0, i - window + 1);
                    const slice = arr.slice(start, i + 1).map(x => Number(x.value));
                    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
                    res.push({ date: arr[i].date, value: Number(avg.toFixed(2)) });
                }
                return res;
            };

            const ma7 = movingAverage(history, 7);
            const ma30 = movingAverage(history, 30);

            // catalog average price for comparison
            let avgPrice = null;
            try {
                const [rows] = await db.query('SELECT price FROM products WHERE price IS NOT NULL');
                const prices = (rows || []).map(r => Number(r.price)).filter(n => !Number.isNaN(n));
                if (prices.length) avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            } catch (ignore) {
                // fallback to top_products
                try {
                    const [rows] = await db.query('SELECT price FROM top_products WHERE price IS NOT NULL');
                    const prices = (rows || []).map(r => Number(r.price)).filter(n => !Number.isNaN(n));
                    if (prices.length) avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                } catch (ignore2) { }
            }

            return res.json({ success: true, history, ma7, ma30, avgPrice });
        } catch (error) {
            console.error('GetProductAnalytics error:', error);
            return res.status(500).json({ success: false, message: 'Product Analytics Error' });
        }
    }
};

module.exports = biController;