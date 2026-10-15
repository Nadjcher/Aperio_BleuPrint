import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/** Réglages de notification par projet (e-mail déjà géré au niveau user). */
@Entity({ name: "notification_settings" })
export class NotificationSetting {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  projectId!: string;

  /** URL de webhook Slack, chiffrée au repos (secret). */
  @Column({ type: "text", nullable: true })
  slackWebhookEnc!: string | null;

  /** Notifier les anomalies critiques. */
  @Column({ type: "boolean", default: true })
  onAnomaly!: boolean;

  /** Notifier les décisions en attente d'approbation. */
  @Column({ type: "boolean", default: true })
  onPendingDecision!: boolean;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
