import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Retour humain sur une décision — alimente la boucle d'apprentissage. */
@Entity({ name: "decision_feedback" })
export class DecisionFeedback {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  decisionId!: string;

  @Column({ type: "boolean" })
  accepted!: boolean;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @Column({ type: "uuid" })
  authorId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
