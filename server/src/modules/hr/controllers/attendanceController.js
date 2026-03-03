const Attendance = require('../models/Attendance');
const Employee   = require('../models/Employee');
const { AppError } = require('../../../shared/middleware/errorHandler');

// ─── Validation helpers ────────────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateTime(t) {
  return !t || TIME_RE.test(String(t).trim());
}

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Returns local YYYY-MM-DD for today (server's timezone). */
function todayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDateInFuture(dateStr) {
  return String(dateStr).split('T')[0] > todayDateStr();
}

/**
 * Auto-determine status from checkIn time:
 *   - no checkIn          → absent
 *   - checkIn after 09:00 → late
 *   - otherwise           → present
 * An explicit non-null status always wins.
 */
function autoStatus(checkIn, explicitStatus) {
  if (explicitStatus) return explicitStatus;
  if (!checkIn) return 'absent';
  return timeToMins(checkIn) > timeToMins('09:00') ? 'late' : 'present';
}

/** Parse time strings from body and validate both. */
function parseAndValidateTimes(checkIn, checkOut) {
  const ci = checkIn  ? String(checkIn).trim()  : undefined;
  const co = checkOut ? String(checkOut).trim() : undefined;
  if (ci && !validateTime(ci)) return { error: 'checkIn must be in HH:MM format (e.g. 09:00)' };
  if (co && !validateTime(co)) return { error: 'checkOut must be in HH:MM format (e.g. 18:00)' };
  if (ci && co && timeToMins(co) <= timeToMins(ci)) return { error: 'checkOut must be after checkIn' };
  return { ci, co };
}

// ─── GET /hr/attendance ────────────────────────────────────────────────────────

exports.getAttendance = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to)   filter.date.$lte = new Date(req.query.to + 'T23:59:59.999Z');
    }

    if (req.query.employee) filter.employee = req.query.employee;

    // Department / name search — resolve to employee IDs first
    if (req.query.department || req.query.search) {
      const empFilter = {};
      if (req.query.department) empFilter.department = new RegExp(req.query.department, 'i');
      if (req.query.search) {
        const re = new RegExp(req.query.search.trim(), 'i');
        empFilter.$or = [{ name: re }, { email: re }, { employeeId: re }];
      }
      const empIds = (await Employee.find(empFilter).select('_id').lean()).map((e) => e._id);
      filter.employee = { $in: empIds };
    }

    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const skip  = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('employee', 'name department profileImage')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { records, total, page, limit } });
  } catch (err) { next(err); }
};

// ─── GET /hr/attendance/daily?date=YYYY-MM-DD ──────────────────────────────────
// Returns every active employee with their attendance record (or null) for the day.

exports.getDailyAttendance = async (req, res, next) => {
  try {
    const dateStr = req.query.date || todayDateStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return next(new AppError('date must be in YYYY-MM-DD format', 400));
    }

    const dayStart = new Date(dateStr + 'T00:00:00.000Z');
    const dayEnd   = new Date(dateStr + 'T23:59:59.999Z');

    const [employees, records] = await Promise.all([
      Employee.find({ status: { $ne: 'inactive' } })
        .select('name department jobTitle profileImage employeeId')
        .sort({ name: 1 })
        .lean(),
      Attendance.find({ date: { $gte: dayStart, $lte: dayEnd } }).lean(),
    ]);

    const recordMap = {};
    records.forEach((r) => { recordMap[r.employee.toString()] = r; });

    const daily = employees.map((emp) => ({
      employee: emp,
      record:   recordMap[emp._id.toString()] || null,
    }));

    res.json({ status: 'success', data: { date: dateStr, daily, total: employees.length } });
  } catch (err) { next(err); }
};

// ─── GET /hr/attendance/stats?from=YYYY-MM-DD&to=YYYY-MM-DD ───────────────────
// Per-employee aggregated stats for the given date range.

exports.getAttendanceStats = async (req, res, next) => {
  try {
    const now = new Date();
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = req.query.to
      ? new Date(req.query.to + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return next(new AppError('Invalid date range', 400));
    }

    const records = await Attendance.find({ date: { $gte: from, $lte: to } })
      .populate('employee', 'name department')
      .lean();

    const statsMap = {};
    for (const r of records) {
      if (!r.employee) continue;
      const eid = r.employee._id.toString();
      if (!statsMap[eid]) {
        statsMap[eid] = {
          employee: { _id: r.employee._id, name: r.employee.name, department: r.employee.department },
          present: 0, absent: 0, late: 0, leave: 0, total: 0,
        };
      }
      statsMap[eid][r.status] = (statsMap[eid][r.status] || 0) + 1;
      statsMap[eid].total++;
    }

    const stats = Object.values(statsMap)
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name));

    res.json({ status: 'success', data: { stats, from, to } });
  } catch (err) { next(err); }
};

// ─── POST /hr/attendance ───────────────────────────────────────────────────────

exports.createAttendance = async (req, res, next) => {
  try {
    const { employee, date, checkIn, checkOut, status, notes } = req.body;

    if (!employee) return next(new AppError('employee is required', 400));
    if (!date)     return next(new AppError('date is required', 400));
    if (isNaN(new Date(date).getTime())) return next(new AppError('Invalid date format — use YYYY-MM-DD', 400));
    if (isDateInFuture(date)) return next(new AppError('Cannot create attendance for a future date', 400));

    const { error, ci, co } = parseAndValidateTimes(checkIn, checkOut);
    if (error) return next(new AppError(error, 400));

    const emp = await Employee.findById(employee);
    if (!emp) return next(new AppError('Employee not found', 404));

    const resolvedStatus = autoStatus(ci, status || null);

    const record = await Attendance.create({
      employee,
      date:       new Date(date),
      checkIn:    ci || undefined,
      checkOut:   co || undefined,
      status:     resolvedStatus,
      notes:      notes ? String(notes).trim().slice(0, 500) : undefined,
      recordedBy: req.user._id,
    });

    const populated = await record.populate('employee', 'name department profileImage');
    res.status(201).json({ status: 'success', data: { record: populated } });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError('Attendance record already exists for this employee on this date', 409));
    }
    next(err);
  }
};

// ─── PATCH /hr/attendance/:id ─────────────────────────────────────────────────

exports.updateAttendance = async (req, res, next) => {
  try {
    const existing = await Attendance.findById(req.params.id);
    if (!existing) return next(new AppError('Attendance record not found', 404));

    const { status, checkIn, checkOut, notes } = req.body;

    // Resolve new values (undefined = keep existing)
    const newCI = checkIn  !== undefined ? (checkIn  ? String(checkIn).trim()  : null) : existing.checkIn  || null;
    const newCO = checkOut !== undefined ? (checkOut ? String(checkOut).trim() : null) : existing.checkOut || null;

    if (newCI && !validateTime(newCI))  return next(new AppError('checkIn must be in HH:MM format', 400));
    if (newCO && !validateTime(newCO))  return next(new AppError('checkOut must be in HH:MM format', 400));
    if (newCI && newCO && timeToMins(newCO) <= timeToMins(newCI)) {
      return next(new AppError('checkOut must be after checkIn', 400));
    }

    const updates = {};
    if (checkIn  !== undefined) updates.checkIn  = newCI || undefined;
    if (checkOut !== undefined) updates.checkOut = newCO || undefined;
    if (notes    !== undefined) updates.notes    = notes ? String(notes).trim().slice(0, 500) : undefined;

    // If status explicitly provided, use it; otherwise auto-derive from new times
    if (status) {
      updates.status = status;
    } else if (checkIn !== undefined || checkOut !== undefined) {
      updates.status = autoStatus(newCI, null);
    }

    const record = await Attendance.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    ).populate('employee', 'name department profileImage');

    res.json({ status: 'success', data: { record } });
  } catch (err) { next(err); }
};

// ─── DELETE /hr/attendance/:id ────────────────────────────────────────────────

exports.deleteAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return next(new AppError('Attendance record not found', 404));
    res.json({ status: 'success', message: 'Attendance record deleted' });
  } catch (err) { next(err); }
};

// ─── POST /hr/attendance/bulk ─────────────────────────────────────────────────
// Body: { date: 'YYYY-MM-DD', records: [{ employee, status?, checkIn?, checkOut?, notes? }] }
// Upserts one record per employee per day.

exports.bulkMarkAttendance = async (req, res, next) => {
  try {
    const { date, records: entries } = req.body;

    if (!date) return next(new AppError('date is required', 400));
    if (isNaN(new Date(date).getTime())) return next(new AppError('Invalid date format — use YYYY-MM-DD', 400));
    if (isDateInFuture(date)) return next(new AppError('Cannot mark attendance for a future date', 400));
    if (!Array.isArray(entries) || entries.length === 0) {
      return next(new AppError('records array is required and must not be empty', 400));
    }

    // Validate each entry
    const validationErrors = [];
    for (const [i, entry] of entries.entries()) {
      if (!entry.employee) {
        validationErrors.push(`Record ${i + 1}: employee is required`);
        continue;
      }
      const ci = entry.checkIn  ? String(entry.checkIn).trim()  : null;
      const co = entry.checkOut ? String(entry.checkOut).trim() : null;
      if (ci && !validateTime(ci)) validationErrors.push(`Record ${i + 1} (${entry.employee}): invalid checkIn — use HH:MM`);
      if (co && !validateTime(co)) validationErrors.push(`Record ${i + 1} (${entry.employee}): invalid checkOut — use HH:MM`);
      if (ci && co && validateTime(ci) && validateTime(co) && timeToMins(co) <= timeToMins(ci)) {
        validationErrors.push(`Record ${i + 1} (${entry.employee}): checkOut must be after checkIn`);
      }
    }
    if (validationErrors.length) return next(new AppError(validationErrors.join('; '), 400));

    const day = new Date(date);
    const ops = entries.map((entry) => {
      const ci = entry.checkIn  ? String(entry.checkIn).trim()  : undefined;
      const co = entry.checkOut ? String(entry.checkOut).trim() : undefined;
      return {
        updateOne: {
          filter: { employee: entry.employee, date: day },
          update: {
            $set: {
              status:     autoStatus(ci || null, entry.status || null),
              checkIn:    ci,
              checkOut:   co,
              notes:      entry.notes ? String(entry.notes).trim().slice(0, 500) : undefined,
              recordedBy: req.user._id,
            },
            $unset: {
              ...(ci ? {} : { checkIn: '' }),
              ...(co ? {} : { checkOut: '' }),
              ...(entry.notes ? {} : {}),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Attendance.bulkWrite(ops);
    res.json({
      status: 'success',
      data: {
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        total:    entries.length,
      },
    });
  } catch (err) { next(err); }
};
