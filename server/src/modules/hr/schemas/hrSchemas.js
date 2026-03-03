const { z } = require('zod');

const employeeSchema = z.object({
  name:        z.string().min(1, 'Name required').max(100),
  email:       z.string().email('Valid email required'),
  phone:       z.string().optional(),
  department:  z.string().optional(),
  jobTitle:    z.string().optional(),
  employeeId:  z.string().optional(),
  startDate:   z.string().optional(),
  status:      z.enum(['active', 'inactive', 'on_leave']).optional().default('active'),
});

const attendancePatchSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'leave']).optional(),
  checkIn:  z.string().optional(),
  checkOut: z.string().optional(),
  notes:    z.string().optional(),
});

const attendanceCreateSchema = z.object({
  employee: z.string().min(1, 'Employee ID required'),
  date:     z.string().min(1, 'Date required'),
  checkIn:  z.string().optional(),
  checkOut: z.string().optional(),
  status:   z.enum(['present', 'absent', 'late', 'leave']).default('present'),
  notes:    z.string().optional(),
});

const jobSchema = z.object({
  title:           z.string().min(1, 'Title required').max(200),
  department:      z.string().optional(),
  location:        z.string().optional(),
  type:            z.enum(['remote', 'onsite', 'hybrid']).optional().default('onsite'),
  experienceLevel: z.string().optional(),
  description:     z.string().optional(),
  status:          z.enum(['active', 'draft', 'closed']).optional().default('draft'),
});

const resumeStatusSchema = z.object({
  applicationStatus: z.enum(['new', 'interview', 'selected', 'rejected']).optional(),
  notes:             z.string().optional(),
});

module.exports = {
  employeeSchema,
  attendancePatchSchema,
  attendanceCreateSchema,
  jobSchema,
  resumeStatusSchema,
};
