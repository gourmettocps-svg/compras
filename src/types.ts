/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Unit = 'kg' | 'un' | 'maço' | 'cx' | 'bandeja';
export type Category = 'Custo de Alimentos' | 'Embalagens' | 'Bebidas';

export interface Item {
  id: string;
  name: string;
  unit: Unit;
  price: number;
  category: Category;
}

export interface OrderItem {
  itemId: string;
  quantity: number;
}

export interface PastOrderItemSnapshot {
  name: string;
  quantity: number;
  unit: Unit;
  price: number;
  category: Category;
}

export interface PastOrder {
  id: string;
  date: string;
  total: number;
  responsible: string;
  itemCount: number;
  details: PastOrderItemSnapshot[];
}

export interface AppState {
  items: Item[];
  order: OrderItem[];
  weeklyGoal: number;
  dailyGoal: number;
  accumulatedWeekly: number;
  responsibleName: string;
  isValidated: boolean;
  history: PastOrder[];
}
