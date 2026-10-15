import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { MilestoneStatus } from "@projectmaster/shared";

/** Jalon d'un projet (échéance + dépendance éventuelle). */
@Entity({ name: "milestones" })
export class Milestone {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "date", nullable: true })
  dueDate!: string | null;

  @Column({ type: "varchar", length: 10, default: "pending" })
  status!: MilestoneStatus;

  @Column({ type: "int", default: 0 })
  orderIndex!: number;

  /** Jalon prérequis (dépendance), optionnel. */
  @Column({ type: "uuid", nullable: true })
  dependsOnId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
