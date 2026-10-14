import { MigrationInterface, QueryRunner } from "typeorm";

/** Préférence d'affichage par utilisateur : mode « simple » (défaut) ou « expert ». */
export class AddUserUiMode1740000000000 implements MigrationInterface {
  name = "AddUserUiMode1740000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "uiMode" character varying(10) NOT NULL DEFAULT 'simple'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "uiMode"`);
  }
}
