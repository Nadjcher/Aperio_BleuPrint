import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { RiskStatus } from "@projectmaster/shared";

/** Risque d'un projet (probabilité × impact). */
@Entity({ name: "risks" })
export class Risk {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "int", default: 3 })
  probability!: number;

  @Column({ type: "int", default: 3 })
  impact!: number;

  @Column({ type: "varchar", length: 120, nullable: true })
  owner!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  tolerance!: string | null;

  @Column({ type: "varchar", length: 12, default: "open" })
  status!: RiskStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
