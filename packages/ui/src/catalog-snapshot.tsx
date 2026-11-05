'use client';
import {orderFinancialSummary} from '@mfu/pricing/order-summary.ts';
import type {RecordData} from './api';
import {useLanguage} from './settings';
import {colorLabel} from './fields';
import {type TranslationKey} from './i18n';

const numeric=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
export function CatalogSnapshot({snapshot,finance,quoteId,record}:{snapshot?:RecordData|null;finance?:RecordData|null;quoteId:string;record?:RecordData}){
 const {t,money,number,date}=useLanguage();if(!snapshot)return null;
 const model=(snapshot.model??{}) as RecordData,selection=(snapshot.selection??{}) as RecordData;
 const material=(snapshot.material??{}) as RecordData,file=snapshot.file as RecordData|null;
 const price=(snapshot.price??{}) as RecordData,quote=(finance?.quote??{}) as RecordData;
 const pricing=(quote.snapshot??{}) as RecordData,estimate=(finance?.verified??quote.estimate??{}) as RecordData;
 const reviewedRates=(estimate.snapshot??pricing) as RecordData,usage=(estimate.usage??{}) as RecordData;
 const customer=(finance?.customer??{}) as RecordData,currentMaterial=finance?.materialCurrent as RecordData|null;
 const hasMeasurements=!!finance?.verified||['approximate','ai-approximate'].includes(String(estimate.confidence));
 const grams=hasMeasurements?numeric(usage.grams):null,printHours=hasMeasurements?numeric(usage.printHours):null;
 const quotedTotal=numeric(quote.final_total)??numeric(price.total);
 const summary=orderFinancialSummary({total:quotedTotal,shipping:numeric(pricing.shipping)??0,taxFraction:numeric(pricing.taxFraction)??0,productionCost:numeric(estimate.productionCost),grams,quantity:numeric(usage.quantity)??numeric(selection.quantity)??1,filamentKg:numeric(reviewedRates.filamentKg)});
 const unit=selection.unit==='cm'?'cm':'mm',dimensions=(selection.dimensions??{}) as RecordData;
 const created=typeof record?.created_at==='string'&&Number.isFinite(Date.parse(record.created_at))?record.created_at:null;
 const knownStock=typeof material.visible==='boolean'&&numeric(material.available_grams)!==null;
 const displayMoney=(value:unknown)=>numeric(value)===null?t('catalog.slicerRequired'):money(Number(value));
 const stockLabel=(visible:unknown,grams:unknown)=>typeof visible==='boolean'&&numeric(grams)!==null?t(visible&&Number(grams)>0?'studio.stock':'common.unavailable'):t('common.unavailable');
 return <section className="panel subform">
  <h2>{t('catalog.snapshot')}</h2><h3>{String(model.name)}</h3>
  {!!model.image_asset_id&&<img className="catalog-reference" src={`/api/catalog-order-image/${quoteId}`} alt={String(model.name)}/>}
  <dl className="summary">
   {!!record?.id&&<><dt>{t('catalog.requestId')}</dt><dd className="record-identifier">{String(record.id)}</dd></>}
   {created&&<><dt>{t('common.created')}</dt><dd><time dateTime={created}>{date(created)}</time></dd></>}
   <dt>{t('catalog.creator')}</dt><dd>{String(model.creator)}</dd>
   <dt>{t('catalog.license')}</dt><dd>{String(model.license_name)} · {model.commercial_allowed?t('catalog.commercial'):t('catalog.pending')}</dd>
   <dt>{t('studio.dimensions')}</dt><dd>{(['x','y','z'] as const).map(axis=>number(Number(dimensions[axis]??0)/(unit==='cm'?10:1))).join(' × ')} {t(`unit.${unit}`)}</dd>
   <dt>{t('studio.colors')}</dt><dd>{colorLabel(t,String(material.color))} · PETG</dd>
   {knownStock&&<><dt>{t('catalog.stockAtRequest')}</dt><dd>{stockLabel(material.visible,material.available_grams)}</dd></>}
   <dt>{t('studio.quantity')}</dt><dd>{number(Number(selection.quantity))}</dd>
   <dt>{t('studio.email')}</dt><dd>{String(selection.contactEmail??'—')}</dd>
   <dt>{t('studio.delivery')}</dt><dd>{t(`value.${String(selection.delivery??'discuss')}` as TranslationKey)}</dd>
   <dt>{t('studio.finishing')}</dt><dd>{t(`value.${String(selection.finishing??'none')}` as TranslationKey)}</dd>
   <dt>{t('order.estimate')}</dt><dd data-testid="catalog-saved-estimate">{displayMoney(price.total)}</dd>
   <dt>{t('catalog.rule')}</dt><dd className="record-identifier">{String(snapshot.pricingRuleId??'—')}</dd>
   {file&&<><dt>{t('catalog.fileName')}</dt><dd>{String(file.filename)}</dd></>}
  </dl>
  {!!model.source_url&&<a className="text-link" target="_blank" rel="noopener noreferrer" href={String(model.source_url)}>{t('catalog.source')} ↗</a>}
  <p className="customer-content">{String(selection.notes??'')}</p>
  {finance&&<>
   <h3>{t('admin.customers')}</h3><dl className="summary">
    <dt>{t('catalog.customerName')}</dt><dd>{String(customer.displayName??'—')}</dd>
    <dt>{t('catalog.accountEmail')}</dt><dd>{String(customer.email??'—')}</dd>
    <dt>{t('catalog.currentStock')}</dt><dd>{currentMaterial?`${stockLabel(currentMaterial.visible,currentMaterial.available_grams)} · ${number(Number(currentMaterial.available_grams))} g`:t('common.unavailable')}</dd>
   </dl>
   <h3>{t('cost.title')}</h3><dl className="cost-results">
    {([['order.total',quotedTotal],['catalog.materialCost',summary.materialCost],['cost.cash',estimate.cashExpenses],['cost.production',estimate.productionCost],['cost.labor',estimate.ownerLabor],['metric.profit',summary.profit]] as const).map(([key,value])=><div key={key}><dt>{t(key)}</dt><dd>{displayMoney(value)}</dd></div>)}
    <div><dt>{t('catalog.targetMargin')}</dt><dd>{numeric(reviewedRates.margin)!==null?`${number(Number(reviewedRates.margin)*100)}%`:t('common.unavailable')}</dd></div>
    <div><dt>{t('catalog.achievedMargin')}</dt><dd>{summary.margin!==null?`${number(summary.margin*100)}%`:t('common.unavailable')}</dd></div>
    <div><dt>{t('inventory.grams')}</dt><dd data-testid="catalog-usage-grams">{grams!==null?number(grams):t('catalog.slicerRequired')}</dd></div>
    <div><dt>{t('field.printHours')}</dt><dd data-testid="catalog-usage-hours">{printHours!==null?number(printHours):t('catalog.slicerRequired')}</dd></div>
   </dl><p className="notice">{t(finance.verified?'catalog.verifiedUsage':'studio.assumptions')}</p>
  </>}
 </section>;
}
