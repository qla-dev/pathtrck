/** Visual interpretation of official range photographs, not OEM CAD or homologation data.
 * Geometry values are dimensionless styling controls. Never use them for cargo planning. */
export type CabProfile={id:string; roof:number; rake:number; grille:number; bars:number; lamp:number; brow:boolean; hood:number};
const profiles:Record<string,CabProfile>={
 generic:{id:'generic',roof:1,rake:.27,grille:.54,bars:4,lamp:.18,brow:false,hood:0},
 mercedes:{id:'mercedes',roof:1.04,rake:.18,grille:.68,bars:3,lamp:.24,brow:true,hood:0},
 volvo:{id:'volvo',roof:1.08,rake:.23,grille:.56,bars:5,lamp:.14,brow:true,hood:0},
 aero:{id:'aero',roof:1.08,rake:.34,grille:.52,bars:5,lamp:.14,brow:true,hood:0},
 scania:{id:'scania',roof:1.06,rake:.13,grille:.7,bars:6,lamp:.2,brow:true,hood:0},
 man:{id:'man',roof:1.02,rake:.16,grille:.76,bars:3,lamp:.23,brow:true,hood:0},
 daf:{id:'daf',roof:1.08,rake:.3,grille:.6,bars:4,lamp:.17,brow:true,hood:0},
 iveco:{id:'iveco',roof:1.03,rake:.24,grille:.72,bars:2,lamp:.22,brow:true,hood:0},
 renault:{id:'renault',roof:1.05,rake:.2,grille:.66,bars:4,lamp:.13,brow:true,hood:0},
 distribution:{id:'distribution',roof:.84,rake:.2,grille:.62,bars:3,lamp:.21,brow:false,hood:0},
 lowEntry:{id:'low-entry',roof:.76,rake:.12,grille:.5,bars:2,lamp:.22,brow:false,hood:0},
 offroad:{id:'offroad',roof:.88,rake:.1,grille:.66,bars:4,lamp:.16,brow:false,hood:.27},
 sprinter:{id:'sprinter',roof:1,rake:.42,grille:.52,bars:3,lamp:.2,brow:false,hood:.22},
 crafter:{id:'crafter',roof:1,rake:.35,grille:.68,bars:4,lamp:.24,brow:false,hood:.18},
 transit:{id:'transit',roof:.98,rake:.45,grille:.63,bars:5,lamp:.15,brow:false,hood:.21},
 master:{id:'master',roof:1,rake:.38,grille:.68,bars:3,lamp:.16,brow:false,hood:.2},
 ducato:{id:'ducato',roof:.98,rake:.32,grille:.73,bars:2,lamp:.23,brow:false,hood:.17},
 daily:{id:'daily',roof:1.02,rake:.4,grille:.56,bars:4,lamp:.16,brow:false,hood:.24},
 compact:{id:'compact',roof:.9,rake:.4,grille:.56,bars:2,lamp:.21,brow:false,hood:.2},
 mediumVan:{id:'medium-van',roof:.94,rake:.38,grille:.62,bars:3,lamp:.2,brow:false,hood:.16},
};
const groups:[string,string[],string][]=[
 ['Mercedes-Benz',['Actros','Actros L','Actros F','eActros','Arocs'],'mercedes'],['Mercedes-Benz',['Atego'],'distribution'],['Mercedes-Benz',['Econic','eEconic'],'lowEntry'],['Mercedes-Benz',['Unimog','Zetros'],'offroad'],
 ['Volvo',['FH','FH16'],'volvo'],['Volvo',['FH Aero','FH16 Aero'],'aero'],['Volvo',['FM','FMX','FE','FL'],'distribution'],
 ['Scania',['R','S','G'],'scania'],['Scania',['P'],'distribution'],['Scania',['L'],'lowEntry'],
 ['MAN',['TGX','TGS','eTGX','eTGS'],'man'],['MAN',['TGL','TGM','eTGM'],'distribution'],
 ['DAF',['XF','XG','XG+','XFC'],'daf'],['DAF',['XB','XD','XDC','CF','LF'],'distribution'],
 ['Iveco',['S-Way','X-Way','T-Way'],'iveco'],['Iveco',['Eurocargo'],'distribution'],
 ['Renault',['T','T High','C','K'],'renault'],['Renault',['D','D Wide'],'distribution'],
 ['Mercedes-Benz',['Sprinter','eSprinter'],'sprinter'],['Mercedes-Benz',['Vito','eVito'],'mediumVan'],['Mercedes-Benz',['Citan','eCitan'],'compact'],
 ['Volkswagen',['Crafter'],'crafter'],['Volkswagen',['Transporter','ID. Buzz Cargo'],'mediumVan'],['Volkswagen',['Caddy Cargo'],'compact'],
 ['Ford',['Transit','E-Transit'],'transit'],['Ford',['Transit Custom','E-Transit Custom'],'mediumVan'],['Ford',['Transit Connect','Transit Courier','E-Transit Courier'],'compact'],
 ['Renault',['Master'],'master'],['Renault',['Trafic'],'mediumVan'],['Renault',['Kangoo'],'compact'],
 ['Fiat',['Ducato','E-Ducato'],'ducato'],['Fiat',['Scudo','E-Scudo'],'mediumVan'],['Fiat',['Doblo','E-Doblo'],'compact'],['Iveco',['Daily','eDaily'],'daily'],
];
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–]/g,'-').trim().replace(/\s+/g,' ');
const sources:Record<string,string>={
 'mercedes-benz':'https://www.mercedes-benz-trucks.com/int/en/trucks.html',volvo:'https://www.volvotrucks.com/en-en/trucks/models.html',scania:'https://www.scania.com/group/en/home/products-and-services/trucks.html',man:'https://www.man.eu/mea/en/trucks/all-models/model-overview/model-overview.html',daf:'https://www.daf.global/en/products-and-services/daf-model-range',iveco:'https://broschueren.iveco.de/',renault:'https://www.renault.co.uk/van-range.html',volkswagen:'https://www.volkswagen-vans.co.uk/en.html',ford:'https://www.ford.co.uk/vans-and-pickups',fiat:'https://www.fiat.it/professional/modello',
};
export function vehicleSeriesProfile(make='',model='',simplified=false) {
 const manufacturer=normalize(make),name=normalize(model).replace(new RegExp('^'+manufacturer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+'),'');
 const matches=groups.filter(([brand])=>normalize(brand)===manufacturer).flatMap(([,models,id])=>models.map(series=>({series,id}))).sort((a,b)=>b.series.length-a.series.length);
 const match=matches.find(({series})=>{const n=normalize(series);return name===n||name.startsWith(n+' ')||name.startsWith(n+'-')||(/^[a-z]$/.test(n)&&new RegExp('^'+n+'\\d').test(name));});
 const base=profiles[simplified?'generic':match?.id||'generic'];
 // Small family-level distinctions, not a claim of a particular roof option or generation.
 const roof=!simplified&&match?({S:1.12,R:1.04,G:.96,'T High':1.12,'Actros L':1.1,'Actros F':.98,'XG+':1.14,XG:1.1} as Record<string,number>)[match.series]:undefined;
 const source=manufacturer==='mercedes-benz'&&match&&['sprinter','mediumVan','compact'].includes(match.id)?'https://group.mercedes-benz.com/company/divisions/mercedes-benz-vans/':manufacturer==='renault'&&match&&['renault','distribution'].includes(match.id)?'https://sacom.renault-trucks.com/pdf-sales-arguments/generate/option_sheets/4108':sources[manufacturer];
 return {cab:roof?{...base,roof}:base,recognized:!!match,series:match?.series||null,source:match?source:null};
}
