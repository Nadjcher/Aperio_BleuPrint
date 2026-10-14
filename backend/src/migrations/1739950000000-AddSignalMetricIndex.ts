import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Index composite pour les agrégats temporels par métrique (forecast/briefing).
 * dailyCounts filtre sur (projectId, type, occurredAt) : cet index évite de
 * balayer tous les signaux d'un projet pour une seule métrique sous charge.
 */
export class AddSignalMetricIndex1739950000000 implements MigrationInterface {
  name = "AddSignalMetricIndex1739950000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_signals_project_type_occurred" ` +
        `ON "signals" ("projectId", "type", "occurredAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signals_project_type_occurred"`);
  }
}
