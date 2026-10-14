import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

/** Affectation d'un membre à un projet (part du temps + vélocité contribuée). */
@Entity({ name: "assignments" })
@Unique(["memberId", "projectId"])
export class Assignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  memberId!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  /** Part du temps allouée à ce projet (0..100 %). */
  @Column({ type: "double precision", default: 100 })
  allocationPct!: number;

  /** Vélocité contribuée au projet (points/semaine). */
  @Column({ type: "double precision", default: 0 })
  velocity!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
