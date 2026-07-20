const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const { ApiError } = require("../middleware/errorHandler");
const slugify = require("slugify");

const jobSummary = {
  id: true, slug: true, title: true, description: true, category: true, location: true,
  employmentType: true, salaryMin: true, salaryMax: true, closesAt: true, createdAt: true,
  company: { select: { name: true, location: true, logoUrl: true } }
};

// GET /api/jobs - candidate-facing list of currently open jobs
const listOpenJobs = asyncHandler(async (req, res) => {
  const { search = "", location = "", category = "" } = req.query;
  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
      ...(location ? { location: { contains: location } } : {}),
      ...(category ? { category: { contains: category } } : {}),
      ...(search ? { OR: ["title", "description", "keywords"].map((field) => ({ [field]: { contains: search } })) } : {})
    },
    select: jobSummary,
    orderBy: { createdAt: "desc" }
  });
  res.json({ success: true, data: { jobs } });
});

// GET /api/jobs/:slug - selected job and its dynamic application questions
const getOpenJob = asyncHandler(async (req, res) => {
  const job = await prisma.job.findFirst({
    where: { slug: req.params.slug, status: "OPEN" },
    select: { ...jobSummary, questions: { select: { id: true, label: true, type: true, required: true, order: true, options: true }, orderBy: { order: "asc" } } }
  });
  if (!job) throw new ApiError(404, "This job is not available.");
  res.json({ success: true, data: { job } });
});

// GET /api/jobs/employer/mine - authenticated portal overview
const listMyJobs = asyncHandler(async (req, res) => {
  const jobs = await prisma.job.findMany({
    where: { companyId: req.employer.companyId },
    select: {
      ...jobSummary,
      status: true,
      _count: { select: { applications: true } },
      questions: { select: questionSelect, orderBy: { order: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ success: true, data: { jobs } });
});

const buildSlug = async (title, excludeId) => {
  const base = slugify(title, { lower: true, strict: true }) || "job";
  let slug = base;
  let counter = 2;
  while (await prisma.job.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
};

const createJob = asyncHandler(async (req, res) => {
  const { title, description, category, location, employmentType, salaryMin, salaryMax, closesAt, questions = [] } = req.body;
  const job = await prisma.job.create({
    data: {
      title, description, category, location, employmentType,
      slug: await buildSlug(title), companyId: req.employer.companyId, createdById: req.employer.id,
      salaryMin: salaryMin === "" || salaryMin === undefined ? null : Number(salaryMin),
      salaryMax: salaryMax === "" || salaryMax === undefined ? null : Number(salaryMax),
      closesAt: closesAt ? new Date(closesAt) : null,
      questions: questions.length ? { create: questions.map((question, index) => ({ label: question.label, type: question.type || "TEXT", required: question.required !== false, order: index + 1, options: question.options ? JSON.stringify(question.options) : null })) } : undefined
    },
    select: { ...jobSummary, status: true, questions: { select: questionSelect } }
  });
  res.status(201).json({ success: true, message: "Job created.", data: { job } });
});

const updateJob = asyncHandler(async (req, res) => {
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.employer.companyId }, select: { id: true, _count: { select: { applications: true } } } });
  if (!existing) throw new ApiError(404, "Job not found.");

  const { title, description, category, location, employmentType, salaryMin, salaryMax, closesAt, status, questions } = req.body;
  if (questions !== undefined && existing._count.applications > 0) {
    throw new ApiError(409, "Cannot modify application questions after candidates have already applied.");
  }

  const data = {
    ...(title !== undefined ? { title, slug: await buildSlug(title, existing.id) } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(location !== undefined ? { location } : {}),
    ...(employmentType !== undefined ? { employmentType } : {}),
    ...(salaryMin !== undefined ? { salaryMin: salaryMin === "" ? null : Number(salaryMin) } : {}),
    ...(salaryMax !== undefined ? { salaryMax: salaryMax === "" ? null : Number(salaryMax) } : {}),
    ...(closesAt !== undefined ? { closesAt: closesAt ? new Date(closesAt) : null } : {}),
    ...(status !== undefined ? { status } : {})
  };

  if (questions !== undefined) {
    data.questions = {
      deleteMany: {},
      create: Array.isArray(questions)
        ? questions.map((question, index) => ({
            label: question.label,
            type: question.type || "TEXT",
            required: question.required !== false,
            order: index + 1,
            options: question.options ? JSON.stringify(question.options) : null
          }))
        : []
    };
  }

  const job = await prisma.job.update({
    where: { id: existing.id },
    data,
    select: { ...jobSummary, status: true, _count: { select: { applications: true } }, questions: { select: questionSelect, orderBy: { order: "asc" } } }
  });

  res.json({ success: true, message: "Job updated.", data: { job } });
});

const deleteJob = asyncHandler(async (req, res) => {
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.employer.companyId }, select: { id: true, _count: { select: { applications: true } } } });
  if (!existing) throw new ApiError(404, "Job not found.");
  if (existing._count.applications) throw new ApiError(409, "This job has applications. Close it instead of deleting it.");
  await prisma.job.delete({ where: { id: existing.id } });
  res.json({ success: true, message: "Job deleted." });
});

const questionSelect = { id: true, label: true, type: true, required: true, order: true, options: true };
module.exports = { listOpenJobs, getOpenJob, listMyJobs, createJob, updateJob, deleteJob };
