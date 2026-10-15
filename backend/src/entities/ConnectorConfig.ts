import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ConnectorProvider } from "@projectmaster/shared";

/** Configuration de connecteur d'un projet (un seul connecteur par projet). */
@Entity({ name: "connector_configs" })
export class ConnectorConfig {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 10 })
  provider!: ConnectorProvider;

  /** Paramètres non sensibles (repo, host, projectKey, teamId…). */
  @Column({ type: "jsonb", default: {} })
  settings!: Record<string, string>;

  /** Token chiffré (AES-256-GCM) ; jamais exposé en clair. */
  @Column({ type: "text", nullable: true })
  tokenEnc!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
