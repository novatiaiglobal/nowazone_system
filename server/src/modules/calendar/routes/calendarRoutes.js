const express = require('express');
const ctrl = require('../controllers/calendarController');
const { protect } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  googleSyncSchema,
} = require('../schemas/calendarSchemas');

const router = express.Router();

// OAuth callback is public because Google redirects here
router.get('/google/callback', ctrl.googleOAuthCallback);

router.use(protect);

router.get('/google/auth-url', ctrl.getGoogleAuthUrl);
router.get('/google/status', ctrl.getGoogleConnectionStatus);
router.delete('/google/disconnect', ctrl.disconnectGoogleCalendar);
router.post('/google/sync', validate(googleSyncSchema), ctrl.syncGoogleCalendar);

router.get('/', ctrl.listEvents);
router.post('/', validate(createCalendarEventSchema), ctrl.createEvent);
router.get('/:id', ctrl.getEvent);
router.patch('/:id', validate(updateCalendarEventSchema), ctrl.updateEvent);
router.delete('/:id', ctrl.deleteEvent);

module.exports = router;
