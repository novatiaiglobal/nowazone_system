const Employee = require('../models/Employee');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { cloudinary } = require('../../../shared/config/cloudinary');

// ── Helpers ────────────────────────────────────────────────────────────────────

const buildFilter = (query) => {
  const filter = {};
  if (query.search) {
    filter.$text = { $search: query.search };
  }
  if (query.department) filter.department = query.department;
  if (query.status)     filter.status     = query.status;
  return filter;
};

const buildSort = (query) => {
  const key  = query.sortBy  || 'name';
  const dir  = query.sortDir === 'desc' ? -1 : 1;
  return { [key]: dir };
};

// ── Controllers ────────────────────────────────────────────────────────────────

exports.getEmployees = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const sort   = buildSort(req.query);
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 50;
    const skip   = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Employee.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { employees, total, page, limit } });
  } catch (err) { next(err); }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };

    if (req.file) {
      body.profileImage = {
        url:      req.file.path,
        publicId: req.file.filename,
      };
    }

    const employee = await Employee.create(body);
    res.status(201).json({ status: 'success', data: { employee } });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return next(new AppError(`${field} already exists`, 409));
    }
    next(err);
  }
};

exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return next(new AppError('Employee not found', 404));
    res.json({ status: 'success', data: { employee } });
  } catch (err) { next(err); }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      // Delete old image if any
      const old = await Employee.findById(req.params.id).select('profileImage').lean();
      if (old?.profileImage?.publicId) {
        await cloudinary.uploader.destroy(old.profileImage.publicId).catch(() => {});
      }
      updates.profileImage = { url: req.file.path, publicId: req.file.filename };
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );
    if (!employee) return next(new AppError('Employee not found', 404));
    res.json({ status: 'success', data: { employee } });
  } catch (err) { next(err); }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));

    if (employee.profileImage?.publicId) {
      await cloudinary.uploader.destroy(employee.profileImage.publicId).catch(() => {});
    }

    if (employee.documents?.length) {
      await Promise.all(
        employee.documents
          .filter((d) => d?.publicId)
          .map((d) =>
            cloudinary.uploader.destroy(d.publicId, { resource_type: d.resourceType || 'raw' }).catch(() => {})
          )
      );
    }

    await employee.deleteOne();
    res.json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

exports.addEmployeeDocument = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));
    if (!req.file) return next(new AppError('No document uploaded', 400));

    const name = (req.body?.name || req.file.originalname || 'Document').toString().trim().slice(0, 80);
    const resourceType = req.file.mimetype?.startsWith('image/') ? 'image' : 'raw';

    employee.documents = employee.documents || [];
    employee.documents.push({
      name,
      url: req.file.path,
      publicId: req.file.filename,
      resourceType,
    });

    await employee.save();
    res.status(201).json({ status: 'success', data: { employee } });
  } catch (err) { next(err); }
};

exports.deleteEmployeeDocument = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));

    const idx = parseInt(req.params.docIndex, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= (employee.documents?.length || 0)) {
      return next(new AppError('Document not found', 404));
    }

    const doc = employee.documents[idx];
    if (doc?.publicId) {
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.resourceType || 'raw' }).catch(() => {});
    }

    employee.documents.splice(idx, 1);
    await employee.save();
    res.json({ status: 'success', data: { employee } });
  } catch (err) { next(err); }
};
