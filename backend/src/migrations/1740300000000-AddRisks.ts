import { MigrationInterface, QueryRunner } from "typeorm";

/** Registre des risques par projet. */
export class AddRisks1740300000000 implements MigrationInterface {
  name = "AddRisks1740300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "risks" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"title" character varying(200) NOT NULL, ` +
        `"description" text, ` +
        `"probability" integer NOT NULL DEFAULT 3, ` +
        `"impact" integer NOT NULL DEFAULT 3, ` +
        `"owner" character varying(120), ` +
        `"tolerance" character varying(200), ` +
        `"status" character varying(12) NOT NULL DEFAULT 'open', ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_risks_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_risks_projectId" ON "risks" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "risks"`);
  }
}
