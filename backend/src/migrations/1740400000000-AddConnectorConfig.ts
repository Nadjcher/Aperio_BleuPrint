import { MigrationInterface, QueryRunner } from "typeorm";

/** Config de connecteur par projet (token chiffré au repos). */
export class AddConnectorConfig1740400000000 implements MigrationInterface {
  name = "AddConnectorConfig1740400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "connector_configs" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"provider" character varying(10) NOT NULL, ` +
        `"settings" jsonb NOT NULL DEFAULT '{}', ` +
        `"tokenEnc" text, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_connector_configs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_connector_configs_projectId" ON "connector_configs" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "connector_configs"`);
  }
}
