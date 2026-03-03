const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formController');
const { protect, authorize } = require('../../../shared/middleware/auth');

// Public form submission endpoints (rate-limited in controller)
router.post('/contact', ctrl.submitContact);
router.post('/assessment', ctrl.submitAssessment);
router.post('/appointment', ctrl.submitAppointment);
router.post('/download', ctrl.submitDownload);

// Admin endpoints
router.get('/submissions', protect, authorize('forms.read'), ctrl.getSubmissions);
router.get('/submissions/:id', protect, authorize('forms.read'), ctrl.getSubmission);
router.patch('/submissions/:id/status', protect, authorize('forms.update'), ctrl.updateSubmissionStatus);
router.get('/stats', protect, authorize('forms.read'), ctrl.getStats);

module.exports = router;
