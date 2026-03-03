const dashboardService = require('../services/dashboardService');

class DashboardController {
  async getExecutiveOverview(req, res, next) {
    try {
      const period = req.query.period || 'today';
      const data = await dashboardService.getExecutiveOverview(period);
      
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrafficData(req, res, next) {
    try {
      const { period } = req.query;
      const data = await dashboardService.getTrafficData(period);
      
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormStats(req, res, next) {
    try {
      const data = await dashboardService.getFormStats();

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
