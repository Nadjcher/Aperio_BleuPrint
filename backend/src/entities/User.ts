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

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
