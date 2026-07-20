const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const { ApiError } = require("../middleware/errorHandler");

const questionSelect = { id: true, label: true, type: true, required: true, order: true, options: true };
const nextQuestion = async (jobId, answeredIds) => prisma.question.findFirst({
  where: { jobId, id: { notIn: answeredIds } }, select: questionSelect, orderBy: { order: "asc" }
});

const uploadCv = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded.");
  const cvUrl = `/uploads/resumes/${req.file.filename}`;
  res.status(200).json({ success: true, cvUrl });
});

const startSession = asyncHandler(async (req, res) => {
  const { jobId, fullName, phone, email, language = "EN", cvUrl } = req.body;
  const job = await prisma.job.findFirst({ where: { id: jobId, status: "OPEN" }, select: { id: true, title: true, company: { select: { botGreetingEn: true, botGreetingSw: true, name: true } } } });
  if (!job) throw new ApiError(404, "This job is not available.");
  const applicant = await prisma.applicant.upsert({ where: { phone }, update: { fullName, email: email || null, preferredLanguage: language }, create: { fullName, phone, email: email || null, preferredLanguage: language } });
  const question = await nextQuestion(job.id, []);
  const session = await prisma.chatSession.create({ data: { applicantId: applicant.id, jobId: job.id, language, contextJson: JSON.stringify({ answers: {}, cvUrl: cvUrl || null }) } });
  const greeting = language === "SW" ? (job.company.botGreetingSw || `Karibu! Unaomba nafasi ya ${job.title}.`) : (job.company.botGreetingEn || `Welcome! You are applying for ${job.title}.`);
  await prisma.chatMessage.createMany({ data: [{ sessionId: session.id, sender: "BOT", content: greeting }, ...(question ? [{ sessionId: session.id, sender: "BOT", content: question.label }] : [])] });
  res.status(201).json({ success: true, data: { sessionId: session.id, greeting, question, complete: !question } });
});

const answerQuestion = asyncHandler(async (req, res) => {
  const { value } = req.body;
  const session = await prisma.chatSession.findFirst({ where: { id: req.params.sessionId, status: "ACTIVE" }, include: { job: true, applicant: true } });
  if (!session || !session.job) throw new ApiError(404, "Chat session was not found or has ended.");
  const context = JSON.parse(session.contextJson || '{"answers":{},"cvUrl":null}');
  const answeredIds = Object.keys(context.answers || {});
  const question = await nextQuestion(session.jobId, answeredIds);
  if (!question) throw new ApiError(400, "This application is already complete.");
  if (question.required && !String(value || "").trim()) throw new ApiError(422, "Please answer this question before continuing.");
  context.answers[question.id] = String(value || "").trim();
  const remaining = await nextQuestion(session.jobId, [...answeredIds, question.id]);
  let application = null;
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({ data: { sessionId: session.id, sender: "USER", content: context.answers[question.id] || "Skipped" } });
    if (remaining) {
      await tx.chatSession.update({ where: { id: session.id }, data: { contextJson: JSON.stringify(context), currentStep: remaining.id } });
      await tx.chatMessage.create({ data: { sessionId: session.id, sender: "BOT", content: remaining.label } });
    } else {
      application = await tx.application.create({
        data: {
          jobId: session.jobId,
          applicantId: session.applicantId,
          resumeUrl: context.cvUrl || null,
          answers: {
            create: Object.entries(context.answers).map(([questionId, answer]) => ({ questionId, value: answer }))
          }
        }
      });
      await tx.chatSession.update({ where: { id: session.id }, data: { contextJson: JSON.stringify(context), applicationId: application.id, status: "COMPLETED", currentStep: "COMPLETE" } });
      await tx.chatMessage.create({ data: { sessionId: session.id, sender: "BOT", content: "Thank you. Your application has been submitted successfully." } });
    }
  });
  res.json({ success: true, data: { question: remaining, complete: !remaining, applicationId: application?.id, message: remaining ? remaining.label : "Thank you. Your application has been submitted successfully." } });
});

const getStatus = asyncHandler(async (req, res) => {
  const { phone, email } = req.query;
  if (!phone && !email) throw new ApiError(400, "Phone or email is required to check status.");

  const applicant = await prisma.applicant.findFirst({ where: phone ? { phone } : { email } });
  if (!applicant) throw new ApiError(404, "No candidate found for the provided contact.");

  const applications = await prisma.application.findMany({
    where: { applicantId: applicant.id },
    include: {
      job: { select: { title: true, location: true } },
      statusHistory: { include: { changedBy: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } }
    },
    orderBy: { submittedAt: "desc" }
  });

  res.json({
    success: true,
    data: {
      applicant: { fullName: applicant.fullName, phone: applicant.phone, email: applicant.email },
      applications
    }
  });
});

module.exports = { startSession, answerQuestion, getStatus, uploadCv };

