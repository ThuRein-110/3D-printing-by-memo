import {it,expect} from 'vitest';
import {orderFinancialSummary,type OrderFinancialInput} from '@mfu/pricing/order-summary.ts';
const input:OrderFinancialInput={total:1110,shipping:40,taxFraction:.07,productionCost:600,grams:100,quantity:2,filamentKg:700};
it('shows achieved profit and margin using net sales rather than tax-inclusive receipts',()=>{
 const r=orderFinancialSummary(input);expect(r.netSales).toBeCloseTo(1000);expect(r.profit).toBeCloseTo(400);expect(r.margin).toBeCloseTo(.4);expect(r.materialCost).toBeCloseTo(140);
});
it('does not replace missing geometry or costs with zero',()=>{
 const r=orderFinancialSummary({...input,grams:null,productionCost:null,total:null});expect(r.materialCost).toBeNull();expect(r.netSales).toBeNull();expect(r.profit).toBeNull();expect(r.margin).toBeNull();
});
it('retains an explicitly authorized loss instead of masking negative profit',()=>{
 const r=orderFinancialSummary({...input,total:147});expect(r.netSales).toBeCloseTo(100);expect(r.profit).toBeCloseTo(-500);expect(r.margin).toBeCloseTo(-5);
});
it('avoids undefined margins and malformed financial data',()=>{
 expect(orderFinancialSummary({...input,total:0,shipping:0,productionCost:0}).margin).toBeNull();
 for(const total of [NaN,Infinity,-1,20])expect(orderFinancialSummary({...input,total}).netSales).toBeNull();
 expect(orderFinancialSummary({...input,taxFraction:2}).netSales).toBeNull();expect(orderFinancialSummary({...input,quantity:0}).materialCost).toBeNull();
});
