const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { listOpenJobs, getOpenJob, listMyJobs, createJob, updateJob, deleteJob } = require("../controllers/jobController");

router.get("/employer/mine", protect, listMyJobs);
router.post("/", protect, [body("title").trim().notEmpty(), body("description").trim().notEmpty(), body("category").trim().notEmpty(), body("location").trim().notEmpty(), body("employmentType").isIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"]), body("questions").optional().isArray()], validate, createJob);
router.put("/:id", protect, [body("title").optional().trim().notEmpty(), body("employmentType").optional().isIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY"]), body("status").optional().isIn(["OPEN", "CLOSED"])], validate, updateJob);
router.delete("/:id", protect, deleteJob);
router.get("/", listOpenJobs);
router.get("/:slug", getOpenJob);
module.exports = router;
