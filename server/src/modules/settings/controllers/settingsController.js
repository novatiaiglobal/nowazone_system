const Settings = require('../models/Settings');
const { AppError } = require('../../../shared/middleware/errorHandler');

const ensureSettings = async () => {
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create({});
  }
  return doc;
};

exports.getSettings = async (req, res, next) => {
  try {
    const doc = await ensureSettings();
    res.json({ status: 'success', data: doc });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const update = {
      ...(payload.general || {}),
      ...(payload.security ? { security: payload.security } : {}),
      ...(payload.notifications ? { notifications: payload.notifications } : {}),
      ...(payload.seo ? { seo: payload.seo } : {}),
      updatedBy: req.user?._id || null,
    };

    const doc = await Settings.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    res.json({ status: 'success', data: doc });
  } catch (err) {
    next(err);
  }
};
