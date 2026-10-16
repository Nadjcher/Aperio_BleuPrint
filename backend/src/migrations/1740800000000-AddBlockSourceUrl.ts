import { MigrationInterface, QueryRunner } from "typeorm";

/** URL externe « Ouvrir dans … » des briques importées. */
export class AddBlockSourceUrl1740800000000 implements MigrationInterface {
  name = "AddBlockSourceUrl1740800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portfolio_blocks" ADD COLUMN IF NOT EXISTS "sourceUrl" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "portfolio_blocks" DROP COLUMN IF EXISTS "sourceUrl"`);
  }
}
