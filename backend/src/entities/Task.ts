import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { TaskStatus } from "@projectmaster/shared";

/** Tâche d'un projet, éventuellement rattachée à un jalon. */
@Entity({ name: "tasks" })
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  milestoneId!: string | null;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  /** Estimation d'effort (points). */
  @Column({ type: "double precision", default: 1 })
  effortPoints!: number;

  @Column({ type: "varchar", length: 10, default: "todo" })
  status!: TaskStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
