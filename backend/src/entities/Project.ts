import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Methodology } from "@projectmaster/shared";

@Entity({ name: "projects" })
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  /** Dépôt suivi au format "owner/repo", optionnel. */
  @Column({ type: "varchar", length: 160, nullable: true })
  repo!: string | null;

  /** Méthodologie de gestion (vocabulaire + format de rapport). */
  @Column({ type: "varchar", length: 10, default: "kanban" })
  methodology!: Methodology;

  /** Propriétaire du projet. */
  @Column({ type: "uuid" })
  ownerId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
