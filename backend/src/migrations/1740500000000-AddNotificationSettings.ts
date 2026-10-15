import { MigrationInterface, QueryRunner } from "typeorm";

/** Réglages de notification par projet (webhook Slack chiffré + bascules). */
export class AddNotificationSettings1740500000000 implements MigrationInterface {
  name = "AddNotificationSettings1740500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "notification_settings" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"slackWebhookEnc" text, ` +
        `"onAnomaly" boolean NOT NULL DEFAULT true, ` +
        `"onPendingDecision" boolean NOT NULL DEFAULT true, ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_notification_settings_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notification_settings_projectId" ON "notification_settings" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
  }
}
