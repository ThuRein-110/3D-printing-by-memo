import {describe,it,expect} from 'vitest';
import {defaultRates,estimate} from '@mfu/pricing';
const usage={service:'ready' as const,grams:100,printHours:4,designHours:0,finishingHours:0,laborHours:.25,quantity:1};
describe('server pricing',()=>{
 it('uses gross margin rather than markup, with tax and shipping after discount',()=>{const r={...defaultRates,basicMinimum:300,filamentKg:1000,machineHour:100,margin:.5,taxFraction:.07,shipping:40};const p=estimate(usage,r);expect(p.subtotal).toBeCloseTo(p.productionCost/(1-r.margin),1);expect(p.total).toBeCloseTo(p.subtotal+p.tax+40,2);expect(p.margin).toBeCloseTo(.5,3);});
 it('protects both floors after discounts',()=>{expect(estimate({...usage,grams:0,printHours:0,laborHours:0},{...defaultRates,discountFraction:1}).total).toBe(300);expect(estimate({...usage,service:'custom'},{...defaultRates,discountFraction:1},{kind:'fixed',value:99999}).total).toBe(1500);});
 it('rejects invalid rates and malformed discounts',()=>{for(const margin of [-1,1,1.1,NaN])expect(()=>estimate(usage,{...defaultRates,margin})).toThrow();expect(()=>estimate(usage,defaultRates,{kind:'percentage',value:101})).toThrow();expect(()=>estimate({...usage,quantity:0},defaultRates)).toThrow();});
 it('snapshots survive later global changes',()=>{const config={...defaultRates};const quote=estimate(usage,config);config.filamentKg=9999;expect(quote.snapshot.filamentKg).toBe(700);expect(quote.total).toBe(estimate(usage,defaultRates).total);});
 it('separates cash, labor, contribution and profit',()=>{const p=estimate(usage,defaultRates);expect(p.contribution).toBeCloseTo(p.subtotal-p.cashExpenses,2);expect(p.profitAfterLabor).toBeCloseTo(p.subtotal-p.productionCost,2);expect(p.ownerLabor).toBe(37.5);});
 it('does not multiply design labor for reprints',()=>{const p=estimate({...usage,designHours:2,quantity:10},defaultRates);expect(p.ownerLabor).toBe(637.5);});
});
