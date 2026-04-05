const Lead = require('../models/Lead');
const User = require('../../auth/models/User');
const { AppError } = require('../../../shared/middleware/errorHandler');
const externalCrm = require('./externalCrmService');

class LeadService {
  async getLeads({ page, limit, status, assignedTo, followUpDue }) {
    const query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (followUpDue === 'true' || followUpDue === true) {
      query.followUpAt = { $ne: null, $lte: new Date() };
    }

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'name email')
        .sort({ score: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(query),
    ]);

    return {
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createLead(data) {
    const existingLead = await Lead.findOne({ email: data.email });
    if (existingLead) {
      throw new AppError('Lead with this email already exists', 400);
    }

    const salesReps = await User.find({ role: 'sales', isActive: true });
    if (salesReps.length > 0) {
      const randomRep = salesReps[Math.floor(Math.random() * salesReps.length)];
      data.assignedTo = randomRep._id;
    }

    const lead = await Lead.create(data);
    const populated = await lead.populate('assignedTo', 'name email');

    // Best-effort external CRM sync; never block lead creation on failure.
    externalCrm.syncLead(populated.toObject())
      .then((crm) => {
        if (!crm) return;
        return Lead.findByIdAndUpdate(
          populated._id,
          {
            externalCrm: {
              provider: crm.provider,
              externalId: crm.externalId,
              syncStatus: 'synced',
              lastSyncAt: new Date(),
            },
          },
          { new: true }
        ).exec().catch(() => {});
      })
      .catch((err) => {
        Lead.findByIdAndUpdate(
          populated._id,
          {
            externalCrm: {
              provider: process.env.CRM_PROVIDER || 'hubspot',
              syncStatus: 'error',
              lastSyncAt: new Date(),
              lastError: err?.message || 'External CRM sync failed',
            },
          },
          { new: true }
        ).exec().catch(() => {});
      });

    return populated;
  }

  async getLeadById(id) {
    const lead = await Lead.findById(id).populate('assignedTo', 'name email');
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
    return lead;
  }

  async updateLead(id, data) {
    const lead = await Lead.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('assignedTo', 'name email');

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    return lead;
  }

  async deleteLead(id) {
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }
  }
}

module.exports = new LeadService();
