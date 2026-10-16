import { MigrationInterface, QueryRunner } from "typeorm";

/** Préférences de livraison du briefing par utilisateur (canaux + webhooks chiffrés). */
export class AddUserDigestPreferences1740900000000 implements MigrationInterface {
  name = "AddUserDigestPreferences1740900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_digest_preferences" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"userId" uuid NOT NULL, ` +
        `"channels" jsonb NOT NULL DEFAULT '[]'::jsonb, ` +
        `"frequency" character varying(10) NOT NULL DEFAULT 'off', ` +
        `"hour" integer NOT NULL DEFAULT 8, ` +
        `"weekday" integer NOT NULL DEFAULT 1, ` +
        `"email" character varying(320), ` +
        `"slackWebhookEnc" text, ` +
        `"teamsWebhookEnc" text, ` +
        `"lastSentOn" character varying(10), ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_user_digest_preferences_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_digest_preferences_userId" ON "user_digest_preferences" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_digest_preferences"`);
  }
}
