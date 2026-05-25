-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "pay_range" TEXT,
    "platform" TEXT,
    "platform_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID,
    "source" TEXT,
    "source_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "distance_mi" DECIMAL(65,30),
    "resume_last_active" DATE,
    "raw_text" TEXT,
    "jobs_json" JSONB,
    "skills_json" JSONB,
    "pdf_key" TEXT,
    "match_score" INTEGER,
    "willing_score" INTEGER,
    "ai_summary" TEXT,
    "flags_json" JSONB,
    "scored_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "pin_note" TEXT,
    "pin_remind" DATE,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "channel" TEXT,
    "draft" TEXT,
    "sent_at" TIMESTAMPTZ,
    "response" TEXT,
    "credited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "outreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ats_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "ats_id" TEXT,
    "stage" TEXT NOT NULL,
    "logged_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ats_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach" ADD CONSTRAINT "outreach_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_log" ADD CONSTRAINT "ats_log_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_log" ADD CONSTRAINT "ats_log_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
