export interface CatalogModel {
 id:string;name:string;description:string;source_kind:'creality'|'owned'|'licensed';source_url:string;
 creator:string;creator_url:string;category:string;tags:string[];license_name:string;license_url:string;
 commercial_allowed:boolean;available:boolean;starting_price:number|null;lead_time_days:number|null;
 hasPreview:boolean;imageUrl:string|null;referenceOnly?:boolean;
}
