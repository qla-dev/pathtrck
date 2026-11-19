import type { Language } from '../../types';
import { registryEn } from './vehicleRegistryCopy';
import { handoverEn, handoverDe } from './handoverCopy';

const en: Record<string,string> = {
 'Demo vozilo · demonstracijske dimenzije':'Demo vehicle · illustrative dimensions',
 'Odustani':'Cancel',
 'Odaberite vozilo i provjerite podatke prije primopredaje.':'Choose a vehicle and review its details before handover.',
 'Nije odabrano vozilo':'No vehicle selected','Nastavi na primopredaju':'Continue to handover','Koraci primopredaje':'Handover steps',
 'Prikazano vozila':'Vehicles shown','Ukupno u obuhvatu':'Total in scope','Nema vozila za odabrane filtere.':'No vehicles match these filters.',
 'Prikazuju se vozila u vašem dozvoljenom obuhvatu.':'Only vehicles within your permitted scope are shown.','Očisti filtere':'Clear filters',
 'Prije primopredaje':'Before handover','Kontrole koje čekaju pregled':'Pending handover reviews',
 'Priložen dokument nije automatski odobren dokument.':'An uploaded document is not automatically approved.',
 'Podaci o klasifikaciji ili kapacitetu zahtijevaju provjeru.':'Classification or capacity data requires review.',
 'Stanje vozila, gorivo i fotografije potvrdite u sljedećem koraku. Primopredaja nije odobrenje za vožnju.':'Confirm vehicle condition, fuel and photos in the next step. A handover does not approve dispatch.',
 'Odaberite vozilo za pregled podataka.':'Select a vehicle to view its details.',
 'Vozilo više nije dostupno za primopredaju. Osvježite flotu.':'This vehicle is no longer available for handover. Refresh the fleet.',
 '3D pregled vozila':'3D vehicle view','Povuci za rotaciju':'Drag to rotate','Bočno':'Side','Sprijeda':'Front','Straga':'Rear','osovine':'axles',
 'Dužina':'Length','Širina':'Width','Visina':'Height','Dužina, širina i visina':'Length, width and height','Prikaz prema unesenim dimenzijama':'View based on recorded dimensions','Približan prikaz prema klasi vozila':'Approximate proportions based on vehicle class',
 'Vanjske dimenzije vozila su opcionalne i određuju proporcije 3D prikaza.':'Overall vehicle dimensions are optional and determine the 3D proportions.',
 'Komandni centar vozila':'Vehicle command centre','Pregled vozila':'Vehicle overview','Generički prikaz':'Generic illustration','Generički prikaz vozila':'Generic vehicle illustration','Karoserija nije navedena':'Body type not specified',
 'Trenutni status':'Current status','Kontrola primopredaje':'Handover review','Nema otvorenih kontrola':'No pending reviews','Vozilo je blokirano za vožnju.':'Vehicle dispatch is blocked.','Arhivirano vozilo':'Archived vehicle',
 'Zaduženi vozač':'Assigned driver','Bez dodijeljenog vozača':'No driver assigned','Današnje ture':'Today’s tours','Nema aktivnih tura danas.':'No active tours today.','Gorivo pri primopredaji':'Fuel at handover','Posljednja primopredaja':'Last handover','Otvoreni predmeti štete':'Open damage cases','Nije evidentirano':'Not recorded','Nosivost i zapremina':'Payload and volume',
 'Baza je trenutno zauzeta. Pokušajte ponovo za nekoliko trenutaka.':'The database is busy. Please try again shortly.','Usluga je trenutno nedostupna. Pokušajte ponovo.':'The service is temporarily unavailable. Please try again.','Prikazani su prethodno učitani podaci.':'Previously loaded data is shown.',
 'Uredi servis':'Edit service','Upravitelj flote':'Fleet manager','Upravitelj depoa':'Depot manager','Disponent':'Dispatcher','Radionica':'Workshop',
 'Globalna flota':'Global fleet','Moja flota':'My fleet','Vozila, depoi, zaduženja i stanje flote':'Vehicles, depots, assignments and fleet status',
 'Dokumenti i statistika':'Documents and statistics','Pregled flote':'Fleet overview','Dodaj vozilo':'Add vehicle','Aktivni depoi':'Active depots','Svi dozvoljeni depoi':'All permitted depots',
 'Nerazvrstano':'Unassigned','Neaktivan':'Inactive','Aktivan':'Active','Vozila':'Vehicles','Primopredaje i štete':'Handovers and damages','Depoi i pristupi':'Depots and access',
 'Tablice, VIN, model…':'Plates, VIN, model…','Uključi arhivirana vozila':'Include archived vehicles','Brojači uključuju arhivu u odabranom obuhvatu.':'Counts include archived vehicles in the selected scope.',
 'Aktivne ture':'Active tours','Kilometraža':'Mileage','Servis':'Service','Dokumenti':'Documents','GPS i telematika':'GPS and telematics','Matični depo':'Home depot','Trenutni depo':'Current depot',
 'Dodjela depoa':'Depot assignment','Otvori evidenciju':'Open records','Sljedeći servis':'Next service','Servisni podaci prikazuju se iz postojeće evidencije vozila.':'Service data comes from the vehicle record.',
 'Otvori mapu':'Open map','Nema GPS podataka.':'No GPS data.','Dodaj depo':'Add depot','Dodijeli pristup':'Grant access','Kod':'Code','Grad':'City','Uredi':'Edit',
 'Član tima':'Team member','Uloga':'Role','Obuhvat':'Scope','Svi depoi':'All depots','Bez pristupa':'No access','Uredi depo':'Edit depot','Naziv':'Name','Adresa':'Address',
 'fleet_manager':'Fleet manager','depot_manager':'Depot manager','dispatcher':'Dispatcher','workshop':'Workshop','Prazan izbor bez opcije svi depoi ukida pristup.':'An empty selection without all depots removes access.',
 'Vrsta primopredaje':'Handover type','Izaberi depo':'Select depot','Naslijeđeni status: aktivno':'Legacy status: active','Naslijeđeni status: parking':'Legacy status: idle',
 'Poveži postojeću štetu':'Link existing damage','Prepoznaj kolone':'Recognize columns','Prijavljena šteta':'Damage reported','Sačuvane izmjene':'Changes saved','Dodani dokumenti':'Documents added','Dodijeljeno':'Assigned','Ponovo otvorena':'Reopened','Uvezeno':'Imported',
 'Primopredaje':'Handovers','Štete':'Damages','Vozila i statusi':'Vehicles and status','Obavijesti':'Notifications','Primopredaja vozila':'Vehicle handover',
 'Kompanija':'Company','Vozilo':'Vehicle','Sva vozila':'All vehicles','Svi statusi':'All statuses','Depo i grad':'Depot and city','Vozač':'Driver','Tablice':'Plates','Status':'Status','Akcije':'Actions',
 'Osvježi':'Refresh','Zatvori':'Close','Sačuvaj':'Save','Učitavanje…':'Loading…','Nema zapisa.':'No records.','Prethodna':'Previous','Sljedeća':'Next','Datum':'Date',
 'Čeka pregled':'Awaiting review','Završena':'Completed','Šteta prijavljena':'Damage reported','Pregled':'Preview','Potvrdi bez nove štete':'Confirm no new damage','Prijavi štetu i završi kontrolu':'Report damage and finish review',
 'Opis štete':'Damage description','Blokiraj vozilo za vožnju':'Block vehicle dispatch','Prethodno stanje':'Previous condition','Trenutno stanje':'Current condition','Predao':'Handed over by','Preuzeo':'Received by','Kontrolisao':'Reviewed by',
 'Prijavljeno':'Reported','U obradi':'In progress','Zatvoreno':'Closed','Interni slučaj':'Internal case','Nezgoda':'Accident','Broj policijskog predmeta':'Police case number','Broj predmeta osiguranja':'Insurance case number',
 'Izjava vozača':'Driver statement','Učesnici i njihova vozila':'Participants and their vehicles','Kontakti vozača, policije i učesnika':'Driver, police and participant contacts','Oštećena tuđa imovina':'Damaged third-party property',
 'Odluka firme i posljedice':'Company decision and consequences','Rješenje slučaja':'Case resolution','Trošak':'Cost','Valuta':'Currency','Dokumenti i fotografije':'Documents and photos','Dodaj dokumente':'Add documents',
 'Historija promjena':'Change history','Razlog promjene':'Reason for change','Na depou ili parkingu':'At depot or parked','U upotrebi':'In use','U radionici':'In workshop','Čeka prodaju':'For sale','Prodat':'Sold','Vraćen najmodavcu':'Returned to lessor','Ukraden':'Stolen',
 'Raspoloživo':'Available','Blokirano':'Blocked','Vlasništvo':'Ownership','Vlastito':'Owned','Rentano':'Rented','Leasing':'Leasing','Finansirano':'Financed','Ostalo':'Other',
 'Dnevne ture':'Daily tours','Tereti':'Loads','Partner':'Partner','ID ture':'Tour ID','Zaključao':'Locked by','Vrijeme zaključavanja':'Lock time','Otvorena':'Open','Zaključana':'Locked','Završena tura':'Completed tour',
 'Dodaj ili uvezi ture':'Add or import tours','Zaključaj':'Lock','Završi turu':'Complete tour','Ponovo otvori':'Reopen','Dodjela':'Assignment','Od':'From','Do':'To','Pretraga':'Search',
 'Partnerov sistem':'Partner system','Link partnera':'Partner link','Arhiva po danima':'Daily archive','Uvezi datoteku':'Import file','Kolona ID ture':'Tour ID column','Kolona vozača':'Driver column','Bez vozača':'No driver',
 'Ručni unos ID-eva, jedan po redu':'Enter tour IDs, one per line','Provjeri uvoz':'Preview import','Potvrdi uvoz':'Confirm import','Spremno za uvoz':'Ready to import','Duplikati':'Duplicates','Neispravni redovi':'Invalid rows',
 'Provjeri datum, depo i partnera prije potvrde.':'Check date, depot and partner before confirming.','Prijedlog vozača':'Suggested driver','Izaberi vozilo':'Select vehicle','Izaberi vozača':'Select driver',
 'Promjena statusa':'Change status','Za povrat rentanog vozila koristi primopredaju.':'Use a handover to return a rented vehicle.','Označi pročitano':'Mark read',
 'Nema pristupa floti.':'No fleet access.','Nazad na listu':'Back to list','Primopredaja ne završava turu.':'Handover does not complete the tour.',
};
const de: Record<string,string> = {'Primopredaje':'Übergaben','Štete':'Schäden','Vozila i statusi':'Fahrzeuge und Status','Obavijesti':'Benachrichtigungen','Primopredaja vozila':'Fahrzeugübergabe','Dnevne ture':'Tagestouren','Tereti':'Ladungen','Vozilo':'Fahrzeug','Vozač':'Fahrer','Tablice':'Kennzeichen','Depo i grad':'Depot und Stadt','Partner':'Partner','ID ture':'Tour-ID','Status':'Status','Datum':'Datum','Zatvori':'Schließen','Sačuvaj':'Speichern','Osvježi':'Aktualisieren','Čeka pregled':'Prüfung ausstehend','Završena':'Abgeschlossen','Zaključaj':'Sperren','Dodaj ili uvezi ture':'Touren hinzufügen oder importieren','Nema zapisa.':'Keine Einträge.'};
Object.assign(de, {
 'Odustani':'Abbrechen','Izaberi vozilo':'Fahrzeug auswählen','Odaberite vozilo i provjerite podatke prije primopredaje.':'Fahrzeug auswählen und Daten vor der Übergabe prüfen.',
 'Nije odabrano vozilo':'Kein Fahrzeug ausgewählt','Nastavi na primopredaju':'Weiter zur Übergabe','Koraci primopredaje':'Übergabeschritte',
 'Svi statusi':'Alle Status','Prikazano vozila':'Angezeigte Fahrzeuge','Ukupno u obuhvatu':'Gesamt im Zugriffsbereich','Nema vozila za odabrane filtere.':'Keine Fahrzeuge für diese Filter.',
 'Prikazuju se vozila u vašem dozvoljenom obuhvatu.':'Es werden nur Fahrzeuge in Ihrem Zugriffsbereich angezeigt.','Očisti filtere':'Filter zurücksetzen',
 'Prije primopredaje':'Vor der Übergabe','Kontrole koje čekaju pregled':'Ausstehende Übergabeprüfungen','Priložen dokument nije automatski odobren dokument.':'Ein hochgeladenes Dokument ist nicht automatisch genehmigt.',
 'Podaci o klasifikaciji ili kapacitetu zahtijevaju provjeru.':'Klassifizierungs- oder Kapazitätsdaten müssen geprüft werden.',
 'Stanje vozila, gorivo i fotografije potvrdite u sljedećem koraku. Primopredaja nije odobrenje za vožnju.':'Fahrzeugzustand, Kraftstoff und Fotos im nächsten Schritt bestätigen. Eine Übergabe erteilt keine Einsatzfreigabe.',
 'Odaberite vozilo za pregled podataka.':'Fahrzeug auswählen, um Details anzuzeigen.','Vozilo više nije dostupno za primopredaju. Osvježite flotu.':'Dieses Fahrzeug ist nicht mehr für die Übergabe verfügbar. Flotte aktualisieren.',
});
Object.assign(de, {'3D pregled vozila':'3D-Fahrzeugansicht','Povuci za rotaciju':'Zum Drehen ziehen','Bočno':'Seite','Sprijeda':'Vorne','Straga':'Hinten','osovine':'Achsen','Dužina':'Länge','Širina':'Breite','Visina':'Höhe','Dužina, širina i visina':'Länge, Breite und Höhe','Prikaz prema unesenim dimenzijama':'Ansicht nach eingetragenen Maßen','Približan prikaz prema klasi vozila':'Ungefähre Proportionen nach Fahrzeugklasse','Vanjske dimenzije vozila su opcionalne i određuju proporcije 3D prikaza.':'Außenmaße sind optional und bestimmen die 3D-Proportionen.'});
Object.assign(en, {'Prikaz prema seriji':'Series styling','Pojednostavljeni prikaz':'Simplified view'}); Object.assign(de, {'Prikaz prema seriji':'Serienansicht','Pojednostavljeni prikaz':'Vereinfachte Ansicht'});
Object.assign(de, {'Demo vozilo · demonstracijske dimenzije':'Demofahrzeug · beispielhafte Maße'});
Object.assign(en, handoverEn); Object.assign(de, handoverDe);
export const fleetCopy = (lang:Language) => (value:string) => {const s=({fleet_manager:'Upravitelj flote',depot_manager:'Upravitelj depoa',dispatcher:'Disponent',workshop:'Radionica',driver:'Vozač'} as Record<string,string>)[value]||value;return ['bs','hr','sr'].includes(lang)?s:lang==='de'?(de[s]||registryEn[s]||en[s]||s):(registryEn[s]||en[s]||s);};
export const fleetField='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white';
export const statusKey:Record<string,string>={active:'Naslijeđeni status: aktivno',available:'Raspoloživo',in_use:'U upotrebi',idle:'Naslijeđeni status: parking',depot:'Na depou ili parkingu',maintenance:'U radionici',for_sale:'Čeka prodaju',sold:'Prodat',returned:'Vraćen najmodavcu',stolen:'Ukraden'};
export const eventLabel:Record<string,string>={reported:'Prijavljena šteta',updated:'Sačuvane izmjene',files_added:'Dodani dokumenti',assigned:'Dodijeljeno',locked:'Zaključana',reopened:'Ponovo otvorena',completed:'Završena tura'};
export function fleetEventText(raw:unknown){
 let d:Record<string,any>;try{d=typeof raw==='string'?JSON.parse(raw):raw||{};}catch{return '';}
 return [d.reason,d.plate||d.previous?.plate,d.details?.resolution,d.details?.consequences,d.details?.driver_statement,d.details?.cost?`${d.details.cost} ${d.details.currency||'EUR'}`:null].filter(Boolean).join(' · ');
}
