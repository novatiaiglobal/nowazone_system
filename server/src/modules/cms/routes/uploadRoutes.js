const express = require('express');
const uploadController = require('../controllers/uploadController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { upload } = require('../../../shared/config/cloudinary');

const router = express.Router();

router.use(protect);

router.post('/file', restrictTo('super_admin', 'admin', 'content_creator'), upload.single('file'), uploadController.uploadFile);
router.delete('/file', restrictTo('super_admin', 'admin', 'content_creator'), uploadController.deleteImage);

module.exports = router;
