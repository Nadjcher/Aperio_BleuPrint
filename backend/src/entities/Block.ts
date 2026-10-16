import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { BlockSource } from "@projectmaster/shared";

/** Brique d'un portefeuille IT (API, application, lot…). */
@Entity({ name: "portfolio_blocks" })
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  /** Type libre, ex. "API", "application", "lot". */
  @Column({ type: "varchar", length: 60 })
  type!: string;

  /** Responsable (personne/équipe) — référence members.id. */
  @Column({ type: "uuid", nullable: true })
  ownerId!: string | null;

  @Column({ type: "date", nullable: true })
  targetDate!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastActivityAt!: Date | null;

  @Column({ type: "varchar", length: 20, default: "manuel" })
  source!: BlockSource;

  @Column({ type: "varchar", length: 300, nullable: true })
  sourceRef!: string | null;

  /** URL externe « Ouvrir dans … » construite à l'import. */
  @Column({ type: "varchar", length: 500, nullable: true })
  sourceUrl!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
