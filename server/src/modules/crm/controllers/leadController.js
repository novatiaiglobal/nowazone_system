const leadService = require('../services/leadService');
const { invalidateDashboardCache } = require('../../../shared/services/dashboardCache');

class LeadController {
  async getLeads(req, res, next) {
    try {
      const { page = 1, limit = 10, status, assignedTo, followUpDue } = req.query;
      const leads = await leadService.getLeads({ page, limit, status, assignedTo, followUpDue });
      
      res.status(200).json({
        status: 'success',
        data: leads,
      });
    } catch (error) {
      next(error);
    }
  }

  async createLead(req, res, next) {
    try {
      const lead = await leadService.createLead(req.validated);
      const io = req.app.get('io');
      if (io) {
        io.to('crm').emit('notification', {
          type: 'new_lead',
          data: { id: lead._id, name: lead.name, email: lead.email, status: lead.status, assignedTo: lead.assignedTo },
        });
        if (lead.assignedTo?._id) {
          io.to(`user:${lead.assignedTo._id}`).emit('notification', {
            type: 'lead_assigned',
            data: { id: lead._id, name: lead.name, email: lead.email },
          });
        }
      }
      res.status(201).json({
        status: 'success',
        message: 'Lead created successfully',
        data: { lead },
      });
      invalidateDashboardCache().catch(() => {});
    } catch (error) {
      next(error);
    }
  }

  async getLeadById(req, res, next) {
    try {
      const lead = await leadService.getLeadById(req.params.id);
      
      res.status(200).json({
        status: 'success',
        data: { lead },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLead(req, res, next) {
    try {
      const lead = await leadService.updateLead(req.params.id, req.validated);
      
      res.status(200).json({
        status: 'success',
        message: 'Lead updated successfully',
        data: { lead },
      });
      invalidateDashboardCache().catch(() => {});
    } catch (error) {
      next(error);
    }
  }

  async deleteLead(req, res, next) {
    try {
      await leadService.deleteLead(req.params.id);
      
      res.status(200).json({
        status: 'success',
        message: 'Lead deleted successfully',
      });
      invalidateDashboardCache().catch(() => {});
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LeadController();
