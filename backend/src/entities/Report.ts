import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { ReportPeriod, ReportRag } from "@projectmaster/shared";

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

  /** Statut RAG, calculé à partir des données. Nullable pour les anciens rapports. */
  @Column({ type: "varchar", length: 10, nullable: true })
  rag!: ReportRag | null;

  /** Phrase justifiant le statut RAG. */
  @Column({ type: "text", nullable: true })
  headline!: string | null;

  @Column({ type: "text" })
  summary!: string;

  @Column({ type: "varchar", length: 10 })
  generatedBy!: "llm" | "heuristic";

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
