import { MigrationInterface, QueryRunner } from "typeorm";

/** Comptes rendus de réunion structurés par projet. */
export class AddMinutes1740600000000 implements MigrationInterface {
  name = "AddMinutes1740600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "meeting_minutes" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"title" character varying(200) NOT NULL, ` +
        `"summary" text NOT NULL, ` +
        `"decisions" jsonb NOT NULL DEFAULT '[]', ` +
        `"actions" jsonb NOT NULL DEFAULT '[]', ` +
        `"risks" jsonb NOT NULL DEFAULT '[]', ` +
        `"openQuestions" jsonb NOT NULL DEFAULT '[]', ` +
        `"generatedBy" character varying(12) NOT NULL DEFAULT 'heuristic', ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_meeting_minutes_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meeting_minutes_projectId" ON "meeting_minutes" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "meeting_minutes"`);
  }
}
