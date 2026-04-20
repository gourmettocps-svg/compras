/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Unit = 'kg' | 'un' | 'maço' | 'cx' | 'bandeja';

export interface Item {
  id: string;
  name: string;
  unit: Unit;
  price: number;
}

export interface OrderItem {
  itemId: string;
  quantity: number;
}

export interface PastOrder {
  id: string;
  date: string;
  total: number;
  responsible: string;
   itemCount: number;
}

export interface AppState {
  items: Item[];
  weeklyGoal: number;
  dailyGoal: number;
  accumulatedWeekly: number;
  responsibleName: string;
  isValidated: boolean;
  history: PastOrder[];
}
