const asyncHandler = require("express-async-handler");
const prisma = require("../config/prisma");
const logger = require("../utils/logger");
const { sendWhatsAppMessage } = require("../services/whatsapp.service");
const { myPhoneNumber, whatsappNumber } = require("../config/twilio");

const sanitizeText = (text) => (text || "").trim();

/**
 * Twilio WhatsApp webhook handler.
 *
 * Important design decisions:
 * - We ALWAYS respond with 200 + plain text "OK".  Twilio treats any non-2xx as
 *   a delivery failure and will retry.  Our bot replies are sent via the Twilio
 *   REST API (sendWhatsAppMessage) not via TwiML, so the HTTP response body
 *   doesn't matter to the user — only the status code does.
 * - All errors are caught here so that Express's JSON error handler never fires
 *   for this route (Twilio can't parse JSON error responses).
 */
const whatsappWebhook = async (req, res) => {
  // Always reply 200 to Twilio, even if processing fails.
  // This prevents Twilio from retrying and sending duplicate messages.
  try {
    const sender = sanitizeText(req.body.From);
    const messageText = sanitizeText(req.body.Body);

    logger.info(`[WhatsApp] Incoming from ${sender}: "${messageText}"`);

    // If Twilio sent a request with no From, there's nothing we can do
    if (!sender) {
      logger.warn("[WhatsApp] Received webhook with no 'From' field — ignoring.");
      return res.status(200).send("OK");
    }

    const normalized = messageText.toLowerCase();
    const session = await prisma.whatsappSession.findFirst({ where: { phone: sender, status: "ACTIVE" } });

    if (!session) {
      const greeting =
        "Welcome to NIAJIRI Recruitment Platform 👋\n\nChoose an option:\n1️⃣ Search Jobs\n2️⃣ Apply for a Job\n3️⃣ Check Application Status\n4️⃣ Talk to a Recruiter";
      await prisma.whatsappSession.create({ data: { phone: sender, state: "AWAITING_MENU", status: "ACTIVE" } });
      await sendWhatsAppMessage(sender, greeting);
      return res.status(200).send("OK");
    }

    let nextMessage = "Sorry, I didn't understand that. Reply with a menu option number (1-4).";
    let update = { lastMessage: messageText };

    if (session.state === "AWAITING_MENU") {
      // Option mapping: 1=Search, 2=Apply, 3=Status, 4=Contact
      if (normalized === "1" || normalized.includes("search")) {
        update.state = "AWAITING_JOB_SEARCH";
        nextMessage = "Please send a job title, category, or location to search open roles.";
      } else if (normalized === "2" || normalized.includes("apply") || normalized.includes("register")) {
        update.state = "AWAITING_NAME";
        nextMessage = "Great! Please send your full name.";
      } else if (normalized === "3" || normalized.includes("status")) {
        update.state = "AWAITING_STATUS_PHONE";
        nextMessage = "To check status, send the phone number you used when applying.";
      } else if (normalized === "4" || normalized.includes("contact") || normalized.includes("recruit")) {
        update.state = "COMPLETED";
        nextMessage = `A recruiter will contact you soon. If you'd like to continue later, reply with "menu".`;
      }
    } else if (session.state === "AWAITING_NAME") {
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "AWAITING_EMAIL", candidateName: messageText, lastMessage: messageText } });
      nextMessage = "Thanks. Now send your email address.";
      await sendWhatsAppMessage(sender, nextMessage);
      return res.status(200).send("OK");
    } else if (session.state === "AWAITING_EMAIL") {
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "AWAITING_SKILLS", candidateEmail: messageText, lastMessage: messageText } });
      nextMessage = "Good. Share your skill keywords separated by commas (e.g. React, Node.js, Django).";
      await sendWhatsAppMessage(sender, nextMessage);
      return res.status(200).send("OK");
    } else if (session.state === "AWAITING_SKILLS") {
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "AWAITING_LOCATION", skills: messageText, lastMessage: messageText } });
      nextMessage = "Nice. What city or region are you based in?";
      await sendWhatsAppMessage(sender, nextMessage);
      return res.status(200).send("OK");
    } else if (session.state === "AWAITING_LOCATION") {
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "AWAITING_CV", location: messageText, lastMessage: messageText } });
      nextMessage = "Please send a link to your CV or portfolio.";
      await sendWhatsAppMessage(sender, nextMessage);
      return res.status(200).send("OK");
    } else if (session.state === "AWAITING_CV") {
      const candidate = await prisma.candidate.upsert({
        where: { phone: sender },
        update: {
          name: session.candidateName || "",
          email: session.candidateEmail || null,
          skills: session.skills || "",
          location: session.location || "",
          cvUrl: messageText,
          whatsappStatus: "REGISTERED",
          updatedAt: new Date()
        },
        create: {
          name: session.candidateName || "",
          phone: sender,
          email: session.candidateEmail || null,
          skills: session.skills || "",
          location: session.location || "",
          cvUrl: messageText,
          whatsappStatus: "REGISTERED"
        }
      });

      await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "COMPLETED", status: "COMPLETED", candidateId: candidate.id, lastMessage: messageText } });
      logger.info(`[WhatsApp] Candidate registered: ${candidate.phone}`);
      nextMessage = "Thank you! Your candidate profile is registered. We will contact you if there is a match.";
      await sendWhatsAppMessage(sender, nextMessage);
      return res.status(200).send("OK");
    } else if (session.state === "AWAITING_JOB_SEARCH") {
      // Treat incoming text as a search query; return a numbered list and set state to await selection
      // NOTE: MySQL does not support Prisma's `mode: "insensitive"` — MySQL string
      // comparisons are case-insensitive by default with utf8/utf8mb4 collations.
      const query = messageText;
      const jobs = await prisma.job.findMany({
        where: {
          status: "OPEN",
          OR: [
            { title: { contains: query } },
            { category: { contains: query } },
            { location: { contains: query } },
            { keywords: { contains: query } }
          ]
        },
        select: { id: true, title: true, location: true, category: true }
      });

      if (!jobs.length) {
        nextMessage = "No open jobs matched that search. Try another keyword or location.";
        update.state = "AWAITING_JOB_SEARCH";
      } else {
        // Build numbered list and save job ids in lastMessage as JSON payload for selection
        const listText = `Available jobs:\n${jobs.map((job, index) => `${index + 1}. ${job.title}`).join("\n\n")}\n\nReply with the job number.`;
        nextMessage = listText;
        update.state = "AWAITING_JOB_SELECTION";
        // store payload in lastMessage so we can reference when user replies with a number
        update.lastMessage = JSON.stringify({ type: "JOB_LIST", jobs: jobs.map((j) => ({ id: j.id, title: j.title })) });
      }
    } else if (session.state === "AWAITING_STATUS_PHONE") {
      const applicant = await prisma.applicant.findFirst({ where: { phone: messageText.trim() } });
      if (!applicant) {
        nextMessage = "No application found with that phone number. Please try again or register as a candidate.";
      } else {
        const applications = await prisma.application.findMany({
          where: { applicantId: applicant.id },
          include: { job: true }
        });
        if (!applications.length) {
          nextMessage = "No applications were found for that phone number. Reply 'menu' to start over.";
        } else {
          nextMessage = applications
            .map((app) => `${app.job.title}: ${app.status}`)
            .join("\n");
        }
        update.state = "COMPLETED";
      }
    } else if (normalized === "menu") {
      update.state = "AWAITING_MENU";
      nextMessage =
        "Welcome back to NIAJIRI Recruitment Platform.\n\nChoose an option:\n1️⃣ Search Jobs\n2️⃣ Apply for a Job\n3️⃣ Check Application Status\n4️⃣ Talk to a Recruiter";
    }

    // Handle job selection when awaiting a numeric choice
    if (session.state === "AWAITING_JOB_SELECTION") {
      const parsed = parseInt(messageText.trim(), 10);
      try {
        const stored = session.lastMessage ? JSON.parse(session.lastMessage) : null;
        if (stored && stored.type === "JOB_LIST" && Number.isInteger(parsed)) {
          const idx = parsed - 1;
          const chosen = stored.jobs[idx];
          if (chosen) {
            // move to name collection for application
            await prisma.whatsappSession.update({ where: { id: session.id }, data: { state: "AWAITING_NAME", lastMessage: JSON.stringify({ selectedJobId: chosen.id }) } });
            await sendWhatsAppMessage(sender, "Great!\n\nPlease enter your full name.");
            return res.status(200).send("OK");
          }
        }
      } catch (e) {
        // fallthrough to normal flow
      }
    }

    await prisma.whatsappSession.update({ where: { id: session.id }, data: update });
    await sendWhatsAppMessage(sender, nextMessage);
    res.status(200).send("OK");

  } catch (err) {
    // CRITICAL: Always return 200 to Twilio even on errors.
    // Returning 4xx/5xx causes Twilio to retry, creating duplicate messages.
    // Log the error for debugging but don't let the user hang.
    logger.error(`[WhatsApp] Webhook error: ${err.message}\n${err.stack}`);
    res.status(200).send("OK");
  }
};

module.exports = { whatsappWebhook };
