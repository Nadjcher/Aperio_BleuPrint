import { MigrationInterface, QueryRunner } from "typeorm";

/** Modèle de planning : jalons (milestones) + tâches (tasks). */
export class AddPlanning1740100000000 implements MigrationInterface {
  name = "AddPlanning1740100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "milestones" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"name" character varying(160) NOT NULL, ` +
        `"dueDate" date, ` +
        `"status" character varying(10) NOT NULL DEFAULT 'pending', ` +
        `"orderIndex" integer NOT NULL DEFAULT 0, ` +
        `"dependsOnId" uuid, ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_milestones_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_milestones_projectId" ON "milestones" ("projectId")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "tasks" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"projectId" uuid NOT NULL, ` +
        `"milestoneId" uuid, ` +
        `"title" character varying(200) NOT NULL, ` +
        `"effortPoints" double precision NOT NULL DEFAULT 1, ` +
        `"status" character varying(10) NOT NULL DEFAULT 'todo', ` +
        `"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_projectId" ON "tasks" ("projectId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_milestoneId" ON "tasks" ("milestoneId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "milestones"`);
  }
}
