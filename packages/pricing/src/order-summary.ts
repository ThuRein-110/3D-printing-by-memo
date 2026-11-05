export interface OrderFinancialInput {
 total:number|null; shipping:number; taxFraction:number;
 productionCost:number|null; grams:number|null; quantity:number; filamentKg:number|null;
}
const valid=(n:number|null):n is number=>n!==null&&Number.isFinite(n)&&n>=0;
// Financial displays must use net sales, excluding collected tax and shipping.
// Missing geometry/costs stay unknown instead of becoming a fabricated zero.
export function orderFinancialSummary(input:OrderFinancialInput){
 const netSales=valid(input.total)&&valid(input.shipping)&&valid(input.taxFraction)&&input.taxFraction<=1&&input.total>=input.shipping?(input.total-input.shipping)/(1+input.taxFraction):null;
 const profit=netSales!==null&&valid(input.productionCost)?netSales-input.productionCost:null;
 const margin=profit!==null&&netSales!==null&&netSales>0?profit/netSales:null;
 const materialCost=valid(input.grams)&&valid(input.filamentKg)&&Number.isInteger(input.quantity)&&input.quantity>0?input.grams/1000*input.filamentKg*input.quantity:null;
 return {netSales,profit,margin,materialCost};
}
