import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { LinkType } from "@projectmaster/shared";

/** Lien typé entre deux briques (fromId dépend de toId pour DEPENDS_ON). */
@Entity({ name: "portfolio_block_links" })
export class BlockLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  fromId!: string;

  @Index()
  @Column({ type: "uuid" })
  toId!: string;

  @Column({ type: "varchar", length: 16, default: "depends_on" })
  type!: LinkType;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
