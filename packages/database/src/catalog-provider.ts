// Authorized providers can implement this contract without changing quotation
// persistence. No undocumented Creality API or scraping adapter is installed.
export interface AuthorizedCatalogProvider {
 readonly name:string;
 getAuthorizedReference(sourceUrl:string):Promise<{
  sourceUrl:string;name:string;creator:string;license:string;
  commercialPermissionEvidence:string;
 }>;
}
export const catalogProviders:ReadonlyMap<string,AuthorizedCatalogProvider>=new Map();
