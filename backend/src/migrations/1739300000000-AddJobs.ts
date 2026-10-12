import { MigrationInterface, QueryRunner } from "typeorm";

/** Table de la file de jobs asynchrones. */
export class AddJobs1739300000000 implements MigrationInterface {
  name = "AddJobs1739300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "jobs" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"type" character varying(40) NOT NULL, ` +
        `"projectId" uuid NOT NULL, ` +
        `"status" character varying(12) NOT NULL DEFAULT 'pending', ` +
        `"attempts" integer NOT NULL DEFAULT 0, ` +
        `"result" jsonb, ` +
        `"error" text, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_jobs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_projectId" ON "jobs" ("projectId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_status_createdAt" ON "jobs" ("status", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_status_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_projectId"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
  }
}
