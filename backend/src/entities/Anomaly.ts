import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { AnomalySeverity, AnomalyStatus } from "@projectmaster/shared";

@Entity({ name: "anomalies" })
@Index(["projectId", "status"])
export class Anomaly {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "varchar", length: 80 })
  metric!: string;

  @Column({ type: "double precision" })
  observed!: number;

  @Column({ type: "double precision" })
  expected!: number;

  @Column({ type: "double precision" })
  zScore!: number;

  @Column({ type: "varchar", length: 10 })
  severity!: AnomalySeverity;

  @Column({ type: "varchar", length: 15, default: "open" })
  status!: AnomalyStatus;

  @Column({ type: "timestamptz" })
  detectedAt!: Date;

  @Column({ type: "text" })
  explanation!: string;
}
