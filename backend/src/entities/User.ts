import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Role } from "@projectmaster/shared";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 320 })
  email!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  /** Hash bcrypt du mot de passe — jamais le mot de passe en clair. */
  @Column({ type: "varchar", length: 100 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20, default: "viewer" })
  role!: Role;

  /** E-mail confirmé via lien. Non bloquant sauf REQUIRE_EMAIL_VERIFICATION=true. */
  @Column({ type: "boolean", default: false })
  emailVerified!: boolean;

  /** Compte d'essai créé sans inscription (limité ; convertible en compte réel). */
  @Column({ type: "boolean", default: false })
  isGuest!: boolean;

  /** Reçoit les notifications par e-mail (alertes d'anomalies, digest). */
  @Column({ type: "boolean", default: true })
  notifyByEmail!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
