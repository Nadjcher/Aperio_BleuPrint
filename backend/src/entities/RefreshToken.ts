import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Jeton de rafraîchissement stocké haché, révocable. */
@Entity({ name: "refresh_tokens" })
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  /** SHA-256 du refresh token ; le jeton en clair n'est jamais stocké. */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  tokenHash!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "boolean", default: false })
  revoked!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
