export function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function normalizeTourDate(value:unknown):string|null{
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
 const s=String(value??'').trim();const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;
 const eu=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);if(eu){const result=`${eu[3]}-${eu[2].padStart(2,'0')}-${eu[1].padStart(2,'0')}`;const date=new Date(result+'T12:00:00');return !Number.isNaN(date.getTime())&&date.getDate()===Number(eu[1])&&date.getMonth()+1===Number(eu[2])?result:null;}
 return null;
}
export function tourImportRows(table:unknown[][],options:{idColumn:number|null;driverColumn:number|null;dateColumn:number|null;date:string;manual:string}){
 const rows:Array<{tour_code:string;driver_name?:string}>=[],invalid:string[]=[];let skipped=0;
 if(options.manual.trim()){options.manual.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(tour_code=>rows.push({tour_code}));}
 else if(options.idColumn===null)invalid.push('Select the Tour ID column.');
 else table.slice(1).forEach((row,index)=>{
  if(row.every(x=>String(x??'').trim()===''))return;
  if(options.dateColumn!==null){const date=normalizeTourDate(row[options.dateColumn]);if(!date){invalid.push(`Row ${index+2}: unrecognized date; use YYYY-MM-DD or DD.MM.YYYY.`);return;}if(date!==options.date){skipped++;return;}}
  rows.push({tour_code:String(row[options.idColumn!]??'').trim(),...(options.driverColumn!==null?{driver_name:String(row[options.driverColumn]??'').trim()}:{})});
 });
 if(rows.length>3000)invalid.push('Maximum 3000 tours per import.');if(!rows.length&&!invalid.length)invalid.push('No tours for the selected day.');
 return {rows,invalid,skipped};
}
