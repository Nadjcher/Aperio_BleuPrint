import { MigrationInterface, QueryRunner } from "typeorm";

/** Retry des jobs échoués : nombre max de tentatives + éligibilité (back-off). */
export class AddJobRetry1739400000000 implements MigrationInterface {
  name = "AddJobRetry1739400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD "maxAttempts" integer NOT NULL DEFAULT 3`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD "runAfter" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_runAfter" ON "jobs" ("runAfter")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_runAfter"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "runAfter"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "maxAttempts"`);
  }
}
