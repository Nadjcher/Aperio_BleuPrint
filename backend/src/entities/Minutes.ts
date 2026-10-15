import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { MinutesAction } from "@projectmaster/shared";

/** Compte rendu de réunion structuré (résultat de l'agent « compte rendu »). */
@Entity({ name: "meeting_minutes" })
export class Minutes {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  summary!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  decisions!: string[];

  @Column({ type: "jsonb", default: () => "'[]'" })
  actions!: MinutesAction[];

  @Column({ type: "jsonb", default: () => "'[]'" })
  risks!: string[];

  @Column({ type: "jsonb", default: () => "'[]'" })
  openQuestions!: string[];

  @Column({ type: "varchar", length: 12, default: "heuristic" })
  generatedBy!: "llm" | "heuristic";

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
