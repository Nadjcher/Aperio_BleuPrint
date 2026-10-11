import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { AgentKind, DecisionStatus } from "@projectmaster/shared";

@Entity({ name: "decisions" })
@Index(["projectId", "status"])
export class Decision {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 20 })
  agent!: AgentKind;

  @Column({ type: "uuid", nullable: true })
  anomalyId!: string | null;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  rationale!: string;

  @Column({ type: "jsonb", default: [] })
  actions!: string[];

  @Column({ type: "double precision", default: 0.5 })
  confidence!: number;

  @Column({ type: "varchar", length: 15, default: "proposed" })
  status!: DecisionStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
