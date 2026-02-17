const express = require('express');
const router = express.Router();

// Ensure the path matches the actual filename casing so it works on case-sensitive OSes
const biController = require('../services/biController');
const authController = require('../services/authController');
const authRoutes = require('./auth');

// This links the URL to the logic
router.get('/stats', biController.getDashboardData);
router.get('/health', biController.healthCheck);
router.get('/kpi/:id/history', biController.getKpiHistory);
router.get('/products', biController.listProducts);
router.get('/product/:id/history', biController.getProductHistory);
router.get('/product/:id/analytics', biController.getProductAnalytics);
router.get('/report', biController.getReport);
router.post('/report/generate', biController.generateReport);
router.get('/report/history', biController.getReportHistory);
// auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authController.me);
router.post('/auth/change-password', authController.changePassword);

// admin
router.get('/admin/users', authController.listUsers);
router.get('/admin/online', authController.listOnline);
router.post('/admin/insert', authController.adminInsert);
router.put('/admin/user', authController.updateUser);
router.delete('/admin/user/:id', authController.deleteUser);

// settings
router.get('/settings', biController.getSettings);
router.put('/settings', biController.updateSettings);

// auth
router.use('/auth', authRoutes);

module.exports = router;