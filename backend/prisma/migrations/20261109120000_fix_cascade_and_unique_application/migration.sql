-- Corrige la dérive entre schema.prisma et la migration initiale :
--   * les clés étrangères passent de ON DELETE RESTRICT à ON DELETE CASCADE ;
--   * ajout de l'unicité (candidateId, jobId) : un candidat ne postule qu'une fois par offre.
--
-- ⚠️ Si une base contient déjà des doublons de candidatures, la création de
-- l'index unique échouera : supprimer les doublons avant de déployer.

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_jobId_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_recruiterId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobId_key" ON "applications"("candidateId", "jobId");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

