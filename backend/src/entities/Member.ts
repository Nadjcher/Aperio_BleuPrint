import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Membre d'équipe (ressource), rattaché au compte qui le gère. */
@Entity({ name: "members" })
export class Member {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Propriétaire (compte) auquel ce membre appartient. */
  @Index()
  @Column({ type: "uuid" })
  ownerId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "jsonb", default: [] })
  skills!: string[];

  @Column({ type: "double precision", default: 35 })
  weeklyCapacity!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
