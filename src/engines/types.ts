export interface DepartmentInput {
  department: string;
  hc: number;
  base: number;
  _division: string;
  _subdivision: string;
}

export interface SubDivisionModel {
  name: string;
  departments: DepartmentInput[];
}

export interface DivisionModel {
  name: string;
  subdivisions: SubDivisionModel[];
}

export interface OrgModel {
  divisions: DivisionModel[];
}

export interface HayFactorScore {
  pts: number;
  note: string;
}

export interface HayKnowHow extends HayFactorScore {
  tech: string;
  breadth: string;
  hr: string;
}

export interface HayProblemSolving extends HayFactorScore {
  env: string;
  pct: number;
}

export interface HayAccountability extends HayFactorScore {
  freedom: string;
  mag: string;
  impact: 'P' | 'C' | 'R';
}

export interface HayEvaluation {
  job: string;
  kh: HayKnowHow;
  ps: HayProblemSolving;
  acc: HayAccountability;
  total: number;
  grade: string;
  context: { divHC: number; divCost: number; stream: string; divDeptCount: number };
}

export type GradeLadderEntry = [number, string];

export interface MoveVerdict {
  verdict: 'VALID' | 'INVALID' | 'HUMAN';
  reasons: string[];
}

export interface DepartmentMoveInput {
  entityType: 'department';
  entity: string;
  from: { division: string; subdivision: string };
  to: { division: string; subdivision: string };
  hayBefore?: { total: number; grade: string };
  hayAfter?: { total: number; grade: string };
}

export interface SubDivisionMoveInput {
  entityType: 'subdivision';
  to: { division: string };
}

export interface PersonMoveInput {
  entityType: 'person';
  toDepartmentName: string;
  toDepartmentPeople: { grade: string }[];
}
