const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const { ApiError } = require("../middleware/errorHandler");

const scopedApplication = (id, companyId) => prisma.application.findFirst({
  where: { id, job: { companyId } },
  include: {
    applicant: true,
    job: { select: { id: true, title: true, location: true, companyId: true } },
    answers: { include: { question: { select: { label: true, type: true, order: true } } }, orderBy: { question: { order: "asc" } } },
    statusHistory: { include: { changedBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } }
  }
});

const listApplications = asyncHandler(async (req, res) => {
  const { status, jobId, search = "", page = 1, limit = 20 } = req.query;
  const where = { job: { companyId: req.employer.companyId }, ...(status ? { status } : {}), ...(jobId ? { jobId } : {}), ...(search ? { OR: [{ applicant: { fullName: { contains: search } } }, { applicant: { phone: { contains: search } } }, { applicant: { email: { contains: search } } }] } : {}) };
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100); const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
  const [applications, total] = await prisma.$transaction([prisma.application.findMany({ where, include: { applicant: true, job: { select: { id: true, title: true, location: true } } }, orderBy: { submittedAt: "desc" }, skip, take }), prisma.application.count({ where })]);
  res.json({ success: true, data: { applications, pagination: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) } } });
});

const getApplication = asyncHandler(async (req, res) => { const application = await scopedApplication(req.params.id, req.employer.companyId); if (!application) throw new ApiError(404, "Application not found."); res.json({ success: true, data: { application } }); });
const updateStatus = asyncHandler(async (req, res) => { const application = await scopedApplication(req.params.id, req.employer.companyId); if (!application) throw new ApiError(404, "Application not found."); const { status, note } = req.body; const updated = await prisma.$transaction(async (tx) => { const record = await tx.application.update({ where: { id: application.id }, data: { status } }); await tx.applicationStatusHistory.create({ data: { applicationId: application.id, status, changedById: req.employer.id, note: note || null } }); return record; }); res.json({ success: true, message: "Application status updated.", data: { application: updated } }); });

const dashboard = asyncHandler(async (req, res) => { const companyId = req.employer.companyId; const [openJobs, closedJobs, totalApplicants, shortlisted, rejected, recentApplications] = await prisma.$transaction([prisma.job.count({ where: { companyId, status: "OPEN" } }), prisma.job.count({ where: { companyId, status: "CLOSED" } }), prisma.application.count({ where: { job: { companyId } } }), prisma.application.count({ where: { job: { companyId }, status: "SHORTLISTED" } }), prisma.application.count({ where: { job: { companyId }, status: "REJECTED" } }), prisma.application.findMany({ where: { job: { companyId } }, include: { applicant: true, job: { select: { title: true } } }, orderBy: { submittedAt: "desc" }, take: 8 })]); res.json({ success: true, data: { metrics: { openJobs, closedJobs, totalApplicants, shortlisted, rejected }, recentApplications } }); });
module.exports = { listApplications, getApplication, updateStatus, dashboard };
