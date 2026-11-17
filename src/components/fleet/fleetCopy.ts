import type { Language } from '../../types';

const en: Record<string,string> = {
 'Uredi servis':'Edit service','Upravitelj flote':'Fleet manager','Upravitelj depoa':'Depot manager','Disponent':'Dispatcher','Radionica':'Workshop',
 'Globalna flota':'Global fleet','Moja flota':'My fleet','Vozila, depoi, zaduženja i stanje flote':'Vehicles, depots, assignments and fleet status',
 'Dokumenti i statistika':'Documents and statistics','Pregled flote':'Fleet overview','Dodaj vozilo':'Add vehicle','Aktivni depoi':'Active depots','Svi dozvoljeni depoi':'All permitted depots',
 'Nerazvrstano':'Unassigned','Neaktivan':'Inactive','Aktivan':'Active','Vozila':'Vehicles','Primopredaje / Štete':'Handovers / damages','Depoi i pristupi':'Depots and access',
 'Tablice, VIN, model…':'Plates, VIN, model…','Uključi arhivirana vozila':'Include archived vehicles','Brojači uključuju arhivu u odabranom obuhvatu.':'Counts include archived vehicles in the selected scope.',
 'Aktivne ture':'Active tours','Kilometraža':'Mileage','Servis':'Service','Dokumenti':'Documents','GPS i telematika':'GPS and telematics','Matični depo':'Home depot','Trenutni depo':'Current depot',
 'Dodjela depoa':'Depot assignment','Otvori evidenciju':'Open records','Sljedeći servis':'Next service','Servisni podaci prikazuju se iz postojeće evidencije vozila.':'Service data comes from the vehicle record.',
 'Otvori mapu':'Open map','Nema GPS podataka.':'No GPS data.','Dodaj depo':'Add depot','Dodijeli pristup':'Grant access','Kod':'Code','Grad':'City','Uredi':'Edit',
 'Član tima':'Team member','Uloga':'Role','Obuhvat':'Scope','Svi depoi':'All depots','Bez pristupa':'No access','Uredi depo':'Edit depot','Naziv':'Name','Adresa':'Address',
 'fleet_manager':'Fleet manager','depot_manager':'Depot manager','dispatcher':'Dispatcher','workshop':'Workshop','Prazan izbor bez opcije svi depoi ukida pristup.':'An empty selection without all depots removes access.',
 'Vrsta primopredaje':'Handover type','Izaberi depo':'Select depot','Naslijeđeni status: aktivno':'Legacy status: active','Naslijeđeni status: parking':'Legacy status: idle',
 'Poveži postojeću štetu':'Link existing damage','Prepoznaj kolone':'Recognize columns','Prijavljena šteta':'Damage reported','Sačuvane izmjene':'Changes saved','Dodani dokumenti':'Documents added','Dodijeljeno':'Assigned','Ponovo otvorena':'Reopened','Uvezeno':'Imported',
 'Primopredaje':'Handovers','Štete':'Damage cases','Vozila i statusi':'Vehicles and status','Obavijesti':'Notifications','Primopredaja vozila':'Vehicle handover',
 'Kompanija':'Company','Vozilo':'Vehicle','Sva vozila':'All vehicles','Svi statusi':'All statuses','Depo / grad':'Depot / city','Vozač':'Driver','Tablice':'Plates','Status':'Status','Akcije':'Actions',
 'Osvježi':'Refresh','Zatvori':'Close','Sačuvaj':'Save','Učitavanje…':'Loading…','Nema zapisa.':'No records.','Prethodna':'Previous','Sljedeća':'Next','Datum':'Date',
 'Čeka pregled':'Awaiting review','Završena':'Completed','Šteta prijavljena':'Damage reported','Pregled':'Preview','Potvrdi bez nove štete':'Confirm no new damage','Prijavi štetu i završi kontrolu':'Report damage and finish review',
 'Opis štete':'Damage description','Blokiraj vozilo za vožnju':'Block vehicle dispatch','Prethodno stanje':'Previous condition','Trenutno stanje':'Current condition','Predao':'Handed over by','Preuzeo':'Received by','Kontrolisao':'Reviewed by',
 'Prijavljeno':'Reported','U obradi':'In progress','Zatvoreno':'Closed','Interni slučaj':'Internal case','Nezgoda':'Accident','Broj policijskog predmeta':'Police case number','Broj predmeta osiguranja':'Insurance case number',
 'Izjava vozača':'Driver statement','Učesnici i njihova vozila':'Participants and their vehicles','Kontakti vozača, policije i učesnika':'Driver, police and participant contacts','Oštećena tuđa imovina':'Damaged third-party property',
 'Odluka firme / posljedice':'Company decision / consequences','Rješenje slučaja':'Case resolution','Trošak':'Cost','Valuta':'Currency','Dokumenti i fotografije':'Documents and photos','Dodaj dokumente':'Add documents',
 'Historija promjena':'Change history','Razlog promjene':'Reason for change','Na depou / parkingu':'At depot / parked','U upotrebi':'In use','U radionici':'In workshop','Čeka prodaju':'For sale','Prodat':'Sold','Vraćen najmodavcu':'Returned to lessor','Ukraden':'Stolen',
 'Raspoloživo':'Available','Blokirano':'Blocked','Vlasništvo':'Ownership','Vlastito':'Owned','Rentano':'Rented','Leasing':'Leasing','Finansirano':'Financed','Ostalo':'Other',
 'Dnevne ture':'Daily tours','Tereti':'Loads','Partner':'Partner','ID ture':'Tour ID','Zaključao':'Locked by','Vrijeme zaključavanja':'Lock time','Otvorena':'Open','Zaključana':'Locked','Završena tura':'Completed tour',
 'Dodaj / uvezi ture':'Add / import tours','Zaključaj':'Lock','Završi turu':'Complete tour','Ponovo otvori':'Reopen','Dodjela':'Assignment','Od':'From','Do':'To','Pretraga':'Search',
 'Partnerov sistem':'Partner system','Link partnera':'Partner link','Arhiva po danima':'Daily archive','Uvezi datoteku':'Import file','Kolona ID ture':'Tour ID column','Kolona vozača':'Driver column','Bez vozača':'No driver',
 'Ručni unos ID-eva, jedan po redu':'Enter tour IDs, one per line','Provjeri uvoz':'Preview import','Potvrdi uvoz':'Confirm import','Spremno za uvoz':'Ready to import','Duplikati':'Duplicates','Neispravni redovi':'Invalid rows',
 'Provjeri datum, depo i partnera prije potvrde.':'Check date, depot and partner before confirming.','Prijedlog vozača':'Suggested driver','Izaberi vozilo':'Select vehicle','Izaberi vozača':'Select driver',
 'Promjena statusa':'Change status','Za povrat rentanog vozila koristi primopredaju.':'Use a handover to return a rented vehicle.','Označi pročitano':'Mark read',
 'Nema pristupa floti.':'No fleet access.','Nazad na listu':'Back to list','Primopredaja ne završava turu.':'Handover does not complete the tour.',
};
const de: Record<string,string> = {'Primopredaje':'Übergaben','Štete':'Schäden','Vozila i statusi':'Fahrzeuge und Status','Obavijesti':'Benachrichtigungen','Primopredaja vozila':'Fahrzeugübergabe','Dnevne ture':'Tagestouren','Tereti':'Ladungen','Vozilo':'Fahrzeug','Vozač':'Fahrer','Tablice':'Kennzeichen','Depo / grad':'Depot / Stadt','Partner':'Partner','ID ture':'Tour-ID','Status':'Status','Datum':'Datum','Zatvori':'Schließen','Sačuvaj':'Speichern','Osvježi':'Aktualisieren','Čeka pregled':'Prüfung ausstehend','Završena':'Abgeschlossen','Zaključaj':'Sperren','Dodaj / uvezi ture':'Touren hinzufügen / importieren','Nema zapisa.':'Keine Einträge.'};
export const fleetCopy = (lang:Language) => (value:string) => {const s=({fleet_manager:'Upravitelj flote',depot_manager:'Upravitelj depoa',dispatcher:'Disponent',workshop:'Radionica',driver:'Vozač'} as Record<string,string>)[value]||value;return ['bs','hr','sr'].includes(lang)?s:lang==='de'?(de[s]||en[s]||s):(en[s]||s);};
export const fleetField='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white';
export const statusKey:Record<string,string>={active:'Naslijeđeni status: aktivno',available:'Raspoloživo',in_use:'U upotrebi',idle:'Naslijeđeni status: parking',depot:'Na depou / parkingu',maintenance:'U radionici',for_sale:'Čeka prodaju',sold:'Prodat',returned:'Vraćen najmodavcu',stolen:'Ukraden'};
export const eventLabel:Record<string,string>={reported:'Prijavljena šteta',updated:'Sačuvane izmjene',files_added:'Dodani dokumenti',assigned:'Dodijeljeno',locked:'Zaključana',reopened:'Ponovo otvorena',completed:'Završena tura'};
export function fleetEventText(raw:unknown){
 let d:Record<string,any>;try{d=typeof raw==='string'?JSON.parse(raw):raw||{};}catch{return '';}
 return [d.reason,d.plate||d.previous?.plate,d.details?.resolution,d.details?.consequences,d.details?.driver_statement,d.details?.cost?`${d.details.cost} ${d.details.currency||'EUR'}`:null].filter(Boolean).join(' · ');
}
