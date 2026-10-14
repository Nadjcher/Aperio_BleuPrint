import { MigrationInterface, QueryRunner } from "typeorm";

/** Modèle d'équipe & ressources : membres + affectations. */
export class AddResources1739900000000 implements MigrationInterface {
  name = "AddResources1739900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "members" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"ownerId" uuid NOT NULL, ` +
        `"name" character varying(120) NOT NULL, ` +
        `"skills" jsonb NOT NULL DEFAULT '[]', ` +
        `"weeklyCapacity" double precision NOT NULL DEFAULT 35, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_members_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_members_ownerId" ON "members" ("ownerId")`);

    await queryRunner.query(
      `CREATE TABLE "assignments" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"memberId" uuid NOT NULL, ` +
        `"projectId" uuid NOT NULL, ` +
        `"allocationPct" double precision NOT NULL DEFAULT 100, ` +
        `"velocity" double precision NOT NULL DEFAULT 0, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_assignments_id" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "UQ_assignment_member_project" UNIQUE ("memberId", "projectId"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_assignments_memberId" ON "assignments" ("memberId")`);
    await queryRunner.query(`CREATE INDEX "IDX_assignments_projectId" ON "assignments" ("projectId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TABLE "members"`);
  }
}
