import { MigrationInterface, QueryRunner } from "typeorm";

/** Schéma initial d'Aperio — généré depuis les entités. */
export class InitialSchema1739200000000 implements MigrationInterface {
  name = "InitialSchema1739200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(320) NOT NULL, "name" character varying(120) NOT NULL, "passwordHash" character varying(100) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'viewer', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens" ("tokenHash") `);
    await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(160) NOT NULL, "repo" character varying(160), "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "signals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "source" character varying(20) NOT NULL, "type" character varying(20) NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "actor" character varying(120), "payload" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_04eeac09c09b65bc55c628c101d" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_9ba441ebe7443ff5a0709f147c" ON "signals" ("projectId") `);
    await queryRunner.query(`CREATE INDEX "IDX_959fd980851b47334488f8ad23" ON "signals" ("projectId", "occurredAt") `);
    await queryRunner.query(`CREATE TABLE "anomalies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "metric" character varying(80) NOT NULL, "observed" double precision NOT NULL, "expected" double precision NOT NULL, "zScore" double precision NOT NULL, "severity" character varying(10) NOT NULL, "status" character varying(15) NOT NULL DEFAULT 'open', "detectedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "explanation" text NOT NULL, CONSTRAINT "PK_85dc6428a06c59628d40b1c5f8e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_fa49554c38b6dd57f01926b575" ON "anomalies" ("projectId") `);
    await queryRunner.query(`CREATE INDEX "IDX_87b11d4117895afcb9b0b0332e" ON "anomalies" ("projectId", "status") `);
    await queryRunner.query(`CREATE TABLE "decisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "agent" character varying(20) NOT NULL, "anomalyId" uuid, "title" character varying(200) NOT NULL, "rationale" text NOT NULL, "actions" jsonb NOT NULL DEFAULT '[]', "confidence" double precision NOT NULL DEFAULT '0.5', "status" character varying(15) NOT NULL DEFAULT 'proposed', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_48eee6fa229cd5e43648f6a2ec3" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_0a014f1046b858edc5a754e157" ON "decisions" ("projectId") `);
    await queryRunner.query(`CREATE INDEX "IDX_88bfea315ce4fd3629e2fc5328" ON "decisions" ("projectId", "status") `);
    await queryRunner.query(`CREATE TABLE "decision_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "decisionId" uuid NOT NULL, "accepted" boolean NOT NULL, "comment" text, "authorId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f7f2a0ae5b26efda93800f7f10" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_d366624907114a2545812f6513" ON "decision_feedback" ("decisionId") `);
    await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" uuid, "action" character varying(80) NOT NULL, "target" character varying(120), "ip" character varying(45), "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_678217ebecd415a0db47435d15" ON "audit_logs" ("actorId", "createdAt") `);
    await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "period" character varying(10) NOT NULL, "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL, "summary" text NOT NULL, "generatedBy" character varying(10) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_b123aed1a96e282b13ac2abcb3" ON "reports" ("projectId") `);
    await queryRunner.query(`CREATE INDEX "IDX_1e301f9abf6130785071bbfc26" ON "reports" ("projectId", "createdAt") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "signals"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9ba441ebe7443ff5a0709f147c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_959fd980851b47334488f8ad23"`);
    await queryRunner.query(`DROP TABLE "anomalies"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa49554c38b6dd57f01926b575"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87b11d4117895afcb9b0b0332e"`);
    await queryRunner.query(`DROP TABLE "decisions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0a014f1046b858edc5a754e157"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_88bfea315ce4fd3629e2fc5328"`);
    await queryRunner.query(`DROP TABLE "decision_feedback"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d366624907114a2545812f6513"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_678217ebecd415a0db47435d15"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b123aed1a96e282b13ac2abcb3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1e301f9abf6130785071bbfc26"`);
  }
}
