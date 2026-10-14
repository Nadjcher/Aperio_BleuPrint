/** Modèle d'équipe & ressources + analyse de gravité cross-projet. */

export interface Member {
  id: string;
  name: string;
  /** Compétences (ex. backend, devops, testing, lead). */
  skills: string[];
  /** Capacité hebdomadaire indicative (points). */
  weeklyCapacity: number;
  createdAt: string;
}

export interface Assignment {
  id: string;
  memberId: string;
  projectId: string;
  /** Part du temps allouée à ce projet (0..100 %). */
  allocationPct: number;
  /** Vélocité contribuée au projet (points/semaine). */
  velocity: number;
  createdAt: string;
}

/** Projet avec ses affectations (vue ressources). */
export interface ProjectResourcing {
  projectId: string;
  totalVelocity: number;
  members: {
    memberId: string;
    name: string;
    skills: string[];
    allocationPct: number;
    velocity: number;
  }[];
}

export type NetImpact = "positive" | "neutral" | "negative";

/** Résultat d'une simulation de déplacement de ressource (gravité). */
export interface ResourceMoveAnalysis {
  member: string;
  from: {
    projectId: string;
    projectName: string;
    velocityBefore: number;
    velocityAfter: number;
    velocityLossPct: number;
    durationIncreasePct: number;
    skillsGap: string[];
  };
  to?: {
    projectId: string;
    projectName: string;
    velocityBefore: number;
    velocityAfter: number;
    velocityGainPct: number;
    effectiveAfterWeeks: number;
  };
  /** 0..100 : plus c'est haut, plus déplacer ce membre est perturbant. */
  gravityScore: number;
  netImpact: NetImpact;
  recommendation: string;
  confidence: number;
}
