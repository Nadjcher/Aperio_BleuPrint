import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { DigestChannel, DigestFrequency } from "@projectmaster/shared";

/**
 * Préférence de livraison du briefing, une par utilisateur. Les webhooks
 * (Slack/Teams) sont chiffrés au repos — jamais stockés ni renvoyés en clair.
 */
@Entity({ name: "user_digest_preferences" })
export class UserDigestPreference {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  userId!: string;

  /** Canaux activés (sous-ensemble de email/slack/teams). */
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  channels!: DigestChannel[];

  @Column({ type: "varchar", length: 10, default: "off" })
  frequency!: DigestFrequency;

  /** Heure d'envoi (0..23, UTC). */
  @Column({ type: "int", default: 8 })
  hour!: number;

  /** Jour d'envoi hebdomadaire (1 = lundi … 0 = dimanche). */
  @Column({ type: "int", default: 1 })
  weekday!: number;

  /** Destinataire e-mail dédié (null = adresse du compte). */
  @Column({ type: "varchar", length: 320, nullable: true })
  email!: string | null;

  /** URL de webhook Slack, chiffrée au repos. */
  @Column({ type: "text", nullable: true })
  slackWebhookEnc!: string | null;

  /** URL de webhook Teams, chiffrée au repos. */
  @Column({ type: "text", nullable: true })
  teamsWebhookEnc!: string | null;

  /** Date (YYYY-MM-DD) du dernier envoi programmé — anti double-envoi. */
  @Column({ type: "varchar", length: 10, nullable: true })
  lastSentOn!: string | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
