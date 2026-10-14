import { MigrationInterface, QueryRunner } from "typeorm";

/** Mode invité (essai sans inscription) + préférence de notification e-mail. */
export class AddGuestAndNotify1739600000000 implements MigrationInterface {
  name = "AddGuestAndNotify1739600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isGuest" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "notifyByEmail" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notifyByEmail"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isGuest"`);
  }
}
