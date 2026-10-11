import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { SignalSource, SignalType } from "@projectmaster/shared";

@Entity({ name: "signals" })
@Index(["projectId", "occurredAt"])
export class Signal {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 20 })
  source!: SignalSource;

  @Column({ type: "varchar", length: 20 })
  type!: SignalType;

  @Column({ type: "timestamptz" })
  occurredAt!: Date;

  /** Acteur minimisé (login public), jamais d'email brut. */
  @Column({ type: "varchar", length: 120, nullable: true })
  actor!: string | null;

  @Column({ type: "jsonb", default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
