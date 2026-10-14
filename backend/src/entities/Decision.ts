import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type {
  AgentKind,
  DecisionActionType,
  DecisionStatus,
} from "@projectmaster/shared";

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

  @Column({ type: "varchar", length: 20, default: "proposed" })
  status!: DecisionStatus;

  /** Action exécutable (none = simple recommandation). */
  @Column({ type: "varchar", length: 40, default: "none" })
  actionType!: DecisionActionType;

  @Column({ type: "boolean", default: false })
  autoApproved!: boolean;

  /** Snapshots avant/après pour le rollback. */
  @Column({ type: "jsonb", nullable: true })
  beforeSnapshot!: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  afterSnapshot!: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  executedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  undoneAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  approvalDeadline!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
