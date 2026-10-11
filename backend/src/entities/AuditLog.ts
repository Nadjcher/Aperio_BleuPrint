import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Journal d'audit : qui a fait quoi, pour la traçabilité et la détection. */
@Entity({ name: "audit_logs" })
@Index(["actorId", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  /** Action, ex. "auth.login", "gdpr.export", "project.create". */
  @Column({ type: "varchar", length: 80 })
  action!: string;

  /** Cible de l'action, ex. "project:<id>". */
  @Column({ type: "varchar", length: 120, nullable: true })
  target!: string | null;

  /** Adresse IP tronquée (minimisation). */
  @Column({ type: "varchar", length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
