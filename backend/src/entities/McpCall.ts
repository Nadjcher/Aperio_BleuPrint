import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/** Trace d'audit d'un appel MCP (what, when, result status, latency). */
@Entity({ name: "mcp_calls" })
@Index(["server", "createdAt"])
export class McpCall {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 80 })
  server!: string;

  @Column({ type: "varchar", length: 120 })
  tool!: string;

  /** ok | error | timeout | cache */
  @Column({ type: "varchar", length: 10 })
  status!: string;

  @Column({ type: "int" })
  latencyMs!: number;

  @Column({ type: "text", nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
