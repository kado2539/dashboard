const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors()); // Allows your React frontend to talk to this backend
app.use(express.json());
// Serve generated report files so the frontend can download/view them
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Link our routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Test Link: http://localhost:${PORT}/api/stats`);
});

// One-time dev: global error handler to log full stack traces for debugging
app.use((err, req, res, next) => {
    console.error('Unhandled error middleware:', err && err.stack ? err.stack : err);
    if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: err && err.message });
    }
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
});