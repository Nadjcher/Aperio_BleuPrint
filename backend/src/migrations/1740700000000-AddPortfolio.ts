import { MigrationInterface, QueryRunner } from "typeorm";

/** Carte du portefeuille : briques + liens de dépendance. */
export class AddPortfolio1740700000000 implements MigrationInterface {
  name = "AddPortfolio1740700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "portfolio_blocks" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"name" character varying(200) NOT NULL, ` +
        `"type" character varying(60) NOT NULL, ` +
        `"ownerId" uuid, ` +
        `"targetDate" date, ` +
        `"lastActivityAt" TIMESTAMP WITH TIME ZONE, ` +
        `"source" character varying(20) NOT NULL DEFAULT 'manuel', ` +
        `"sourceRef" character varying(300), ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_portfolio_blocks_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portfolio_blocks_projectId" ON "portfolio_blocks" ("projectId")`,
    );
    // Upsert idempotent des briques importées (jamais les briques manuelles).
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_portfolio_blocks_source" ` +
        `ON "portfolio_blocks" ("projectId", "source", "sourceRef") WHERE "source" <> 'manuel'`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "portfolio_block_links" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"fromId" uuid NOT NULL, ` +
        `"toId" uuid NOT NULL, ` +
        `"type" character varying(16) NOT NULL DEFAULT 'depends_on', ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_portfolio_block_links_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_portfolio_links" ` +
        `ON "portfolio_block_links" ("fromId", "toId", "type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portfolio_links_from" ON "portfolio_block_links" ("fromId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_portfolio_links_to" ON "portfolio_block_links" ("toId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_block_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "portfolio_blocks"`);
  }
}
