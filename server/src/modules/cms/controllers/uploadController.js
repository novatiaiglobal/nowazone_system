const { cloudinary } = require('../../../shared/config/cloudinary');

class UploadController {
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }
      // Cloudinary stores file, return its URL and publicId
      res.status(200).json({
        status: 'success',
        data: {
          url: req.file.path,
          publicId: req.file.filename,
          resourceType: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req, res, next) {
    try {
      const { publicId } = req.body;
      
      if (!publicId) {
        return res.status(400).json({
          status: 'error',
          message: 'Public ID is required',
        });
      }

      await cloudinary.uploader.destroy(publicId);

      res.status(200).json({
        status: 'success',
        message: 'Image deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
