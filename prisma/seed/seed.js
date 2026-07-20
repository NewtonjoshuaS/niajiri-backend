require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const slugify = require("slugify");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Niajiri Recruitment Platform database...");

  const company = await prisma.company.upsert({
    where: { id: "seed-company-niajiri" },
    update: {},
    create: {
      id: "seed-company-niajiri",
      name: "Niajiri Group Ltd",
      about: "A demo employer account for the Niajiri Recruitment Platform.",
      location: "Dar es Salaam, Tanzania",
      botGreetingEn: "Karibu 👋 Karibu kwenye Niajiri Recruitment Platform. Type KAZI to begin.",
      botGreetingSw: "Karibu 👋 Karibu kwenye Niajiri Recruitment Platform. Andika KAZI kuanza.",
      botLanguageDefault: "EN"
    }
  });

  const passwordHash = await bcrypt.hash("Password123!", Number(process.env.BCRYPT_SALT_ROUNDS || 12));

  const employer = await prisma.employer.upsert({
    where: { email: "employer@niajiri.co.tz" },
    update: {},
    create: {
      companyId: company.id,
      fullName: "Newton Joshua Sinda",
      email: "employer@niajiri.co.tz",
      passwordHash,
      role: "OWNER"
    }
  });

  const jobsData = [
    {
      title: "Sales Representative",
      category: "Sales",
      location: "Mwanza",
      employmentType: "FULL_TIME",
      description: "Drive sales growth by identifying leads, closing deals, and maintaining client relationships in the Mwanza region.",
      keywords: "sales, mwanza, representative, business development",
      questions: [
        { label: "What is your full name?", type: "TEXT", required: true, order: 1 },
        { label: "How many years of sales experience do you have?", type: "NUMBER", required: true, order: 2 },
        { label: "Do you have your own means of transport?", type: "YES_NO", required: true, order: 3 },
        { label: "Preferred start date", type: "DATE", required: false, order: 4 },
        {
          label: "Which sales sector do you have the most experience in?",
          type: "DROPDOWN",
          required: true,
          order: 5,
          options: JSON.stringify(["Retail", "FMCG", "Financial Services", "Telecom", "Other"])
        }
      ]
    },
    {
      title: "Shopkeeper",
      category: "Retail",
      location: "Mwanza",
      employmentType: "FULL_TIME",
      description: "Manage daily shop operations including stock control, customer service, and cash handling.",
      keywords: "shopkeeper, retail, mwanza, shop attendant",
      questions: [
        { label: "What is your full name?", type: "TEXT", required: true, order: 1 },
        { label: "Have you managed a shop or till before?", type: "YES_NO", required: true, order: 2 },
        { label: "Briefly describe your relevant experience.", type: "TEXTAREA", required: false, order: 3 }
      ]
    },
    {
      title: "Marketing Officer",
      category: "Marketing",
      location: "Dar es Salaam",
      employmentType: "FULL_TIME",
      description: "Plan and execute marketing campaigns across digital and traditional channels to grow brand awareness.",
      keywords: "marketing, dar es salaam, digital marketing, brand",
      questions: [
        { label: "What is your full name?", type: "TEXT", required: true, order: 1 },
        { label: "Share a link to your portfolio (if any).", type: "TEXT", required: false, order: 2 },
        { label: "Years of marketing experience", type: "NUMBER", required: true, order: 3 }
      ]
    }
  ];

  for (const jobData of jobsData) {
    const { questions, ...jobFields } = jobData;
    const slug = slugify(`${jobFields.title}-${jobFields.location}`, { lower: true, strict: true });

    const job = await prisma.job.upsert({
      where: { slug },
      update: {},
      create: {
        ...jobFields,
        slug,
        companyId: company.id,
        createdById: employer.id,
        status: "OPEN"
      }
    });

    for (const q of questions) {
      const existing = await prisma.question.findFirst({ where: { jobId: job.id, label: q.label } });
      if (!existing) {
        await prisma.question.create({ data: { ...q, jobId: job.id } });
      }
    }
  }

  console.log("Seed complete.");
  console.log("Employer login -> email: employer@niajiri.co.tz | password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
