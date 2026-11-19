/** Suggestions restored from the former registration wizard, never defaults or legal classification. */
const TRUCKS: Record<string,readonly string[]>={
 'Mercedes-Benz':['Actros','Actros L','Actros F','eActros','Arocs','Atego','Econic','eEconic','Unimog','Zetros'],
 Volvo:['FH','FH16','FH Aero','FH16 Aero','FM','FMX','FE','FL'],Scania:['L','P','G','R','S'],MAN:['TGX','TGS','TGM','TGL','eTGX','eTGS','eTGM'],
 DAF:['XF','XG','XG+','XD','XDC','XFC','XB','CF','LF'],Iveco:['S-Way','X-Way','T-Way','Eurocargo'],Renault:['T','T High','C','K','D','D Wide'],
};
const VANS: Record<string,readonly string[]>={
 'Mercedes-Benz':['Sprinter','eSprinter','Vito','eVito','Citan','eCitan'],Volkswagen:['Crafter','Transporter','Caddy Cargo','ID. Buzz Cargo'],Ford:['Transit','E-Transit','Transit Custom','E-Transit Custom','Transit Courier','E-Transit Courier','Transit Connect'],Renault:['Master','Trafic','Kangoo'],Fiat:['Ducato','E-Ducato','Scudo','E-Scudo','Doblo','E-Doblo'],Iveco:['Daily','eDaily'],
};
const AIRCRAFT: Record<string,readonly string[]>={Boeing:['747-8F','777F','767F'],Airbus:['A330-200F'],Antonov:['AN-124','AN-225']};
// Shipbuilders sell vessel designs/types rather than road-style model series. Maersk is an operator.
const SHIPS: Record<string,readonly string[]>={Hyundai:['Container class','LNG carrier','LPG carrier','Crude oil carrier','Car carrier'],Maersk:['Triple E class'],Damen:['General cargo class','Combi Freighter 4200','Combi Freighter 5000','Combi Freighter 6000','Combi Freighter 7000','Combi Freighter 8200'],Samsung:['Tanker class','Container ship','LNG carrier','Shuttle tanker']};
export function vehicleIdentityCatalog(mode:string,resource:string):Record<string,readonly string[]> {
 if(mode==='air')return AIRCRAFT;
 if(mode==='sea')return SHIPS;
 if(resource==='cargo_van')return VANS;
 if(['rigid_truck','tractor_unit'].includes(resource))return TRUCKS;
 if(['semi_trailer','trailer'].includes(resource))return {};
 const road:Record<string,readonly string[]>={...TRUCKS};
 for(const [make,models] of Object.entries(VANS))road[make]=[...new Set([...(road[make]||[]),...models])];
 return road;
}
export function vehicleModels(catalog:Record<string,readonly string[]>,make:string):readonly string[]{
 const key=Object.keys(catalog).find(key=>key.toLocaleLowerCase()===make.trim().toLocaleLowerCase());
 return key?catalog[key]:[];
}
