import { MigrationInterface, QueryRunner } from "typeorm";

/** Point d'avancement : statut RAG + phrase de justification sur les rapports. */
export class AddReportStatus1741000000000 implements MigrationInterface {
  name = "AddReportStatus1741000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "rag" character varying(10)`);
    await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "headline" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN IF EXISTS "headline"`);
    await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN IF EXISTS "rag"`);
  }
}
