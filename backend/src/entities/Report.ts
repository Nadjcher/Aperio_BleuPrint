import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { ReportPeriod } from "@projectmaster/shared";

@Entity({ name: "reports" })
@Index(["projectId", "createdAt"])
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 10 })
  period!: ReportPeriod;

  @Column({ type: "timestamptz" })
  periodStart!: Date;

  @Column({ type: "timestamptz" })
  periodEnd!: Date;

  @Column({ type: "text" })
  summary!: string;

  @Column({ type: "varchar", length: 10 })
  generatedBy!: "llm" | "heuristic";

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
