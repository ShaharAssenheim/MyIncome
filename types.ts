export enum IncomeType {
  CASH = 'CASH',
  BIT = 'BIT',
  BANK = 'BANK'
}

export interface Transaction {
  id: string;
  amount: number;
  type: IncomeType;
  date: string; // ISO string
  description?: string;
  createdAt: string; // ISO string
}

export interface MonthlyStats {
  total: number;
  cash: number;
  bit: number;
  bank: number;
}

export interface CategoryConfig {
  id: IncomeType;
  label: string;
  color: string;
  bgStart: string;
  bgEnd: string;
  textColor: string;
  iconColor: string;
}