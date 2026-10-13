import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { JobStatus, JobType } from "@projectmaster/shared";

/** Job asynchrone traité par le worker (file en base). */
@Entity({ name: "jobs" })
@Index(["status", "createdAt"])
export class Job {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40 })
  type!: JobType;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 12, default: "pending" })
  status!: JobStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "int", default: 3 })
  maxAttempts!: number;

  /** Éligibilité : le worker ne prend le job que si runAfter <= now() (back-off). */
  @Index()
  @Column({ type: "timestamptz", default: () => "now()" })
  runAfter!: Date;

  @Column({ type: "jsonb", nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
