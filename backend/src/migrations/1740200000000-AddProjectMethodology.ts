import { MigrationInterface, QueryRunner } from "typeorm";

/** Méthodologie de gestion par projet (Kanban par défaut). */
export class AddProjectMethodology1740200000000 implements MigrationInterface {
  name = "AddProjectMethodology1740200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "methodology" character varying(10) NOT NULL DEFAULT 'kanban'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "methodology"`);
  }
}
