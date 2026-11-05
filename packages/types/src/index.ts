export const orderStatuses = ['draft','submitted','reviewing','awaiting_customer_approval','approved','awaiting_deposit','paid_deposit','designing','printing','finishing','ready','shipped','completed','cancelled'] as const;
export type OrderStatus = typeof orderStatuses[number];
export type Service = 'ready' | 'custom' | 'photo' | 'reprint';
export type JobState = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined };
export interface Material { id: string; name: string; color: string; hex: string; available_grams: number; visible: boolean }
export const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
 draft:['submitted','cancelled'], submitted:['reviewing','cancelled'], reviewing:['awaiting_customer_approval','cancelled'],
 awaiting_customer_approval:['approved','reviewing','cancelled'], approved:['awaiting_deposit','cancelled'],
 awaiting_deposit:['paid_deposit','cancelled'], paid_deposit:['designing','printing','cancelled'],
 designing:['awaiting_customer_approval','printing','cancelled'], printing:['finishing','cancelled'],
 finishing:['ready','printing','cancelled'], ready:['shipped','completed'], shipped:['completed'], completed:[], cancelled:[]
};
export function canTransition(from: OrderStatus, to: OrderStatus, role: 'admin' | 'customer') {
 return transitions[from].includes(to) && (role === 'admin' ||
  (from === 'draft' && to === 'submitted') ||
  (from === 'awaiting_customer_approval' && ['approved','reviewing'].includes(to)) ||
  (from === 'shipped' && to === 'completed'));
}
export const money = (value: number, locale = 'th-TH') => new Intl.NumberFormat(locale,{style:'currency',currency:'THB'}).format(value);
export interface PaymentGateway { createIntent(orderId: string, amountSatang: number, idempotencyKey: string): Promise<{id:string; redirectUrl:string}>; verify(raw: Uint8Array, signature: string): Promise<{id:string; amountSatang:number}> }
