/** Suggestions restored from the former registration wizard, never defaults or legal classification. */
const TRUCKS: Record<string,readonly string[]>={
 'Mercedes-Benz':['Actros'],Volvo:['FH','FH16'],Scania:['R','S'],MAN:['TGX','TGS'],DAF:['XF','CF'],Iveco:['S-Way'],
};
const VANS: Record<string,readonly string[]>={
 'Mercedes-Benz':['Sprinter','Vito'],Volkswagen:['Crafter','Transporter'],Ford:['Transit','Transit Custom'],Renault:['Master','Trafic'],Fiat:['Ducato'],Iveco:['Daily'],
};
const AIRCRAFT: Record<string,readonly string[]>={Boeing:['747-8F','777F','767F'],Airbus:['A330-200F'],Antonov:['AN-124','AN-225']};
const SHIPS: Record<string,readonly string[]>={Hyundai:['Container class'],Maersk:['Ro-Ro class'],Damen:['General cargo class'],Samsung:['Tanker class']};
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
