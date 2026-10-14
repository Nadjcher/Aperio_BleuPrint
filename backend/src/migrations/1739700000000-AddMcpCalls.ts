import { MigrationInterface, QueryRunner } from "typeorm";

/** Table d'audit des appels MCP (orchestration côté client). */
export class AddMcpCalls1739700000000 implements MigrationInterface {
  name = "AddMcpCalls1739700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_calls" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"server" character varying(80) NOT NULL, ` +
        `"tool" character varying(120) NOT NULL, ` +
        `"status" character varying(10) NOT NULL, ` +
        `"latencyMs" integer NOT NULL, ` +
        `"error" text, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_mcp_calls_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_calls_server_createdAt" ON "mcp_calls" ("server", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_mcp_calls_server_createdAt"`);
    await queryRunner.query(`DROP TABLE "mcp_calls"`);
  }
}
