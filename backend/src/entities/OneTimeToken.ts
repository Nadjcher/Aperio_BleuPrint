import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** But d'un jeton à usage unique. */
export type TokenPurpose = "password_reset" | "email_verify";

/**
 * Jeton à usage unique (réinitialisation de mot de passe, vérification d'e-mail).
 * Stocké haché (SHA-256) ; le jeton en clair n'est envoyé que par e-mail.
 */
@Entity({ name: "one_time_tokens" })
export class OneTimeToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 20 })
  purpose!: TokenPurpose;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  tokenHash!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
