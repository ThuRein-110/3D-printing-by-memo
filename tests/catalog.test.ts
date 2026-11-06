import {it,expect} from 'vitest';
import {zipSync,strToU8} from 'fflate';
import {catalogSchema,safeSourceUrl} from '@mfu/validation/catalog.ts';
import {defaultRates,estimate} from '@mfu/pricing';
import {parseMesh,resizeMesh} from '@mfu/three';
import {validateHeader} from '@mfu/validation';
import {glbFixture} from './fixtures';

const model={name:'Original part',description:'',source_kind:'creality',source_url:'https://www.crealitycloud.com/model-detail/67b5bb96187ad77afbc111b3',creator:'Designer',creator_url:'https://www.crealitycloud.com/user-profile/example',category:'Parts',tags:['PETG'],license_name:'Written commercial permission',license_url:'',commercial_allowed:true,license_approved:true,preview_allowed:false,printability:'approved',visible:true,available:true,mesh_asset_id:null,image_asset_id:null,starting_price:null,lead_time_days:null,review_note:'Written authorization reviewed'};
it('requires separate image permission for a reference thumbnail while keeping printing disabled',()=>{
 const reference={...model,showcase_visible:true,visible:false,available:false,commercial_allowed:false,license_approved:false,image_asset_id:'92111111-1111-4111-8111-111111111111'};
 expect(catalogSchema.safeParse(reference).success).toBe(false);expect(catalogSchema.safeParse({...reference,image_permission:'Creator-approved image use for source attribution cards'}).success).toBe(true);expect(catalogSchema.safeParse({...reference,image_permission:'Creator-approved image use for source attribution cards',available:true}).success).toBe(false);
});
it('accepts official detail URLs without fetching any provider content',()=>{expect(safeSourceUrl(model.source_url,true)).toBe(model.source_url);expect(catalogSchema.parse(model).visible).toBe(true);});
it.each(['http://www.crealitycloud.com/model-detail/abc','https://www.crealitycloud.com.evil.example/model-detail/abc','https://user@www.crealitycloud.com/model-detail/abc','https://www.crealitycloud.com:444/model-detail/abc','https://www.crealitycloud.com/model-category/3d-print-all','https://www.crealitycloud.com/model-detail/abc?url=x','https://127.0.0.1/model-detail/abc','javascript:alert(1)'])('rejects invalid source URL %s',url=>{expect(()=>safeSourceUrl(url,true)).toThrow();});
it('requires reviewed commercial permission and printability before publication',()=>{for(const field of ['commercial_allowed','license_approved'])expect(catalogSchema.safeParse({...model,[field]:false}).success).toBe(false);expect(catalogSchema.safeParse({...model,printability:'pending'}).success).toBe(false);expect(catalogSchema.parse({...model,visible:false,commercial_allowed:false,license_approved:false}).visible).toBe(false);expect(catalogSchema.safeParse({...model,review_note:''}).success).toBe(false);expect(catalogSchema.safeParse({...model,source_kind:'owned'}).success).toBe(false);});
it('uses the new minimums and protects production cost unless a promotion explicitly permits it',()=>{
 const u={service:'ready' as const,grams:0,printHours:0,designHours:0,finishingHours:0,laborHours:0,quantity:1};
 expect(estimate(u,defaultRates).minimum).toBe(100);expect(estimate({...u,service:'custom'},defaultRates).minimum).toBe(1500);
 const r={...defaultRates,machineHour:200,discountFraction:1},costly={...u,printHours:10};
 const normal=estimate(costly,r,{kind:'percentage',value:100});expect(normal.subtotal).toBeGreaterThanOrEqual(normal.productionCost);
 expect(estimate(costly,r,{kind:'percentage',value:100,allowBelowCost:true}).subtotal).toBe(100);
 const historical=estimate(u,{...defaultRates,basicMinimum:300});expect(historical.minimum).toBe(300);expect(historical.snapshot.basicMinimum).toBe(300);
});
function archive(xml:string,extra:Record<string,Uint8Array>={}){return zipSync({'3D/3dmodel.model':strToU8(xml),...extra});}
const xml='<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="centimeter"><resources><object id="1"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/><vertex x="0" y="0" z="1"/></vertices><triangles><triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/><triangle v1="1" v2="2" v3="3"/><triangle v1="2" v2="0" v3="3"/></triangles></mesh></object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0"/></build></model>';
it('loads real bounded 3MF mesh geometry, units and affine build transforms',()=>{const bytes=archive(xml);expect(validateHeader('model.3mf',bytes)).toBe('3mf');const mesh=parseMesh(bytes,'3mf');expect(mesh.triangles).toBe(4);expect(mesh.closed).toBe(true);expect(mesh.dimensions).toEqual({x:10,y:10,z:10});expect(mesh.positions[0]).toBe(20);expect(resizeMesh(parseMesh(glbFixture(),'glb'),{x:20,y:20,z:20}).dimensions.x).toBeCloseTo(20);});
it('rejects archive traversal, XML entities, missing references and expansion bombs',()=>{
 expect(()=>parseMesh(archive(xml,{'../escape':strToU8('bad')}),'3mf')).toThrow();
 expect(()=>parseMesh(archive('<!DOCTYPE model [<!ENTITY x SYSTEM "file:///secret">]>'+xml),'3mf')).toThrow();
 expect(()=>parseMesh(archive(xml.replace('objectid="1"','objectid="99"')),'3mf')).toThrow();
 expect(()=>parseMesh(archive('x'.repeat(4194305)),'3mf')).toThrow();
 expect(()=>parseMesh(archive(xml.replace('<mesh>','<components/><mesh>')),'3mf')).toThrow();
});
