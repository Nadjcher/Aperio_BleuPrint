import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "projects" })
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  /** Dépôt suivi au format "owner/repo", optionnel. */
  @Column({ type: "varchar", length: 160, nullable: true })
  repo!: string | null;

  /** Propriétaire du projet. */
  @Column({ type: "uuid" })
  ownerId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
