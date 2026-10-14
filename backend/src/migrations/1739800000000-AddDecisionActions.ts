import { MigrationInterface, QueryRunner } from "typeorm";

/** Décisions actionnables : type d'action, approbation, snapshots, rollback. */
export class AddDecisionActions1739800000000 implements MigrationInterface {
  name = "AddDecisionActions1739800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La colonne status passe de 15 à 20 caractères (nouveaux statuts).
    await queryRunner.query(
      `ALTER TABLE "decisions" ALTER COLUMN "status" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "decisions" ADD "actionType" character varying(40) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "decisions" ADD "autoApproved" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "decisions" ADD "beforeSnapshot" jsonb`);
    await queryRunner.query(`ALTER TABLE "decisions" ADD "afterSnapshot" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "decisions" ADD "executedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "decisions" ADD "undoneAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "decisions" ADD "approvalDeadline" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "approvalDeadline"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "undoneAt"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "executedAt"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "afterSnapshot"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "beforeSnapshot"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "autoApproved"`);
    await queryRunner.query(`ALTER TABLE "decisions" DROP COLUMN "actionType"`);
    await queryRunner.query(
      `ALTER TABLE "decisions" ALTER COLUMN "status" TYPE character varying(15)`,
    );
  }
}
