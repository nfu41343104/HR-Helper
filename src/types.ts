export interface Person {
  id: string;
  name: string;
  department?: string;
  email?: string;
  note?: string;
}

export interface Prize {
  id: string;
  name: string;
  quantity: number;
}

export interface DrawRecord {
  id: string;
  prizeName: string;
  winnerId: string;
  winnerName: string;
  winnerDepartment?: string;
  timestamp: number;
}

export interface TeamGroup {
  id: string;
  name: string;
  color: string;
  members: Person[];
  leaderId?: string;
}

export type GroupingMethod = 'by_member_count' | 'by_group_count';
export type GroupingStrategy = 'random' | 'department_balanced';
