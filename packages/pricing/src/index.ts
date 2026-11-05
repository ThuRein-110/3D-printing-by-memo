import { z } from 'zod';
import { ratesSchema } from '@mfu/validation';
import type { Service } from '@mfu/types';
export type Rates = z.infer<typeof ratesSchema>;
// Illustrative defaults. Admin must review and publish actual operating costs.
export const defaultRates: Rates = {filamentKg:700,machineHour:25,electricityKwh:5,averageKw:0.25,laborHour:150,designHour:300,finishingHour:150,supportFraction:0.15,setup:50,basicMinimum:100,customMinimum:1500,packaging:20,hardware:0,failureFraction:0.1,overheadFraction:0.1,shipping:0,taxFraction:0,margin:0.4,rushFraction:0,discountFraction:0};
export interface Usage {service:Service;grams:number;printHours:number;designHours:number;finishingHours:number;laborHours:number;quantity:number}
const usageSchema=z.object({service:z.enum(['ready','custom','photo','reprint']),grams:z.number().finite().min(0).max(100000),printHours:z.number().finite().min(0).max(10000),designHours:z.number().finite().min(0).max(10000),finishingHours:z.number().finite().min(0).max(10000),laborHours:z.number().finite().min(0).max(10000),quantity:z.number().int().min(1).max(100)});
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function estimate(raw:Usage, config:Rates, promotion?:{kind:'fixed'|'percentage';value:number;allowBelowCost?:boolean}) {
 const u=usageSchema.parse(raw), r=ratesSchema.parse(config);
 if(promotion && (!Number.isFinite(promotion.value)||promotion.value<0||(promotion.kind==='percentage'&&promotion.value>100))) throw new Error('Invalid promotion');
 const material=u.grams/1000*r.filamentKg*u.quantity;
 const support=material*r.supportFraction;
 const electricity=u.printHours*r.averageKw*r.electricityKwh*u.quantity;
 const machine=u.printHours*r.machineHour*u.quantity;
 const waste=(material+support+electricity+machine)*r.failureFraction;
 const cash=material+support+electricity+r.hardware*u.quantity+r.packaging+waste;
 const labor=u.designHours*r.designHour+u.finishingHours*r.finishingHour*u.quantity+u.laborHours*r.laborHour;
 const overhead=(cash+machine+labor)*r.overheadFraction;
 const production=cash+machine+labor+overhead+r.setup;
 const floor=(u.service==='custom'||u.service==='photo')?r.customMinimum:r.basicMinimum;
 const original=Math.max(floor,production/(1-r.margin))*(1+r.rushFraction);
 const configured=original*(1-r.discountFraction);
 const promo=promotion ? promotion.kind==='percentage'?configured*promotion.value/100:promotion.value : 0;
 // Service floors remain protected after all discounts; tax and shipping follow.
 const subtotal=round(Math.max(floor,promotion?.allowBelowCost?0:production,configured-promo));
 const tax=round(subtotal*r.taxFraction), total=round(subtotal+tax+r.shipping);
 const profit=round(subtotal-round(production));
 return Object.freeze({total,subtotal,tax,shipping:r.shipping,original:round(original),discount:round(original-subtotal),productionCost:round(production),cashExpenses:round(cash),ownerLabor:round(labor),contribution:round(subtotal-round(cash)),profitAfterLabor:profit,margin:subtotal?profit/subtotal:0,minimum:floor,snapshot:structuredClone(r),usage:structuredClone(u),confidence:'illustrative' as const});
}
