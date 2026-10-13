import { MigrationInterface, QueryRunner } from "typeorm";

/** Vérification d'e-mail + jetons à usage unique (reset mot de passe / vérif). */
export class AddEmailAuth1739500000000 implements MigrationInterface {
  name = "AddEmailAuth1739500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "emailVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "one_time_tokens" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"purpose" character varying(20) NOT NULL, ` +
        `"tokenHash" character varying(64) NOT NULL, ` +
        `"expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, ` +
        `"usedAt" TIMESTAMP WITH TIME ZONE, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_one_time_tokens_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ott_tokenHash" ON "one_time_tokens" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ott_userId" ON "one_time_tokens" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_ott_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ott_tokenHash"`);
    await queryRunner.query(`DROP TABLE "one_time_tokens"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
  }
}
