export type ContainerFactor = 'volumeFit' | 'weightFit' | 'dimensionFit' | 'palletFit' | 'cargoCompatibility' | 'routeAvailability' | 'carrierAvailability' | 'costEfficiency';
export type ContainerRecommendation = {
  type: string;
  label: string;
  quantity: number;
  score: number;
  coverage: number;
  reasons: string[];
  notes: string[];
  factors: Record<ContainerFactor, number | null>;
  weights: Record<ContainerFactor, number>;
  volumeUtilization: number;
  weightUtilization: number;
  capacity: { usableVolumeM3: number; payloadKg: number; source: string };
  calculation: { weightKg: number; volumeM3: number; byVolume: number; byWeight: number; byUnits: number; unitsPerContainer: number | null };
};
export type ContainerRecommendationResult = {
  version: string;
  status: 'not_applicable' | 'insufficient_data' | 'specialist_review' | 'estimated';
  candidates: ContainerRecommendation[];
  warnings: string[];
};

const en = {
  title: 'Container recommendations', recommended: 'Recommended', alternative: 'Alternative', match: 'estimated match',
  coverage: 'Scored data coverage', copy: 'Copy to container field', selected: 'In container field', field: 'Container field',
  note: 'Note', formula: 'Formula and explanation', loading: 'Calculating recommendations…', failed: 'Recommendations could not be loaded.', retry: 'Retry',
  unknown: 'Not verified', volume: 'Volume utilization', weight: 'Payload utilization', source: 'Equipment dimensions',
  advice: 'Up to three options. Copy the option you want; recommendations do not change the container field automatically.',
  scoreFormula: 'Score = Σ(score × weight) / Σ(known weights). Unknown factors are excluded. This is a planning score, not a probability.',
  countFormula: 'Count = max(ceil(CBM / usable CBM), ceil(kg / planning payload), ceil(units / floor slots) when known).',
  countProxy: 'Cost proxy = 100 × lowest candidate count / this count. Equal scores prefer fewer containers, then more volume reserve. No carrier price comparison.',
  volumeFit: 'Volume fit', weightFit: 'Weight fit', dimensionFit: 'Dimension fit', palletFit: 'Pallet fit', cargoCompatibility: 'Cargo compatibility',
  routeAvailability: 'Route availability', carrierAvailability: 'Carrier availability', costEfficiency: 'Cost efficiency (count proxy)',
  volume_sufficient: 'Sufficient estimated volume', weight_within_limit: 'Weight within planning payload', general_cargo_suitable: 'Suitable for stated general cargo',
  upright_floor_fit: 'Identical upright units fit the estimated floor grid without stacking', minimum_container_count: 'Lowest estimated container count',
  more_containers: 'Requires more containers than the recommended option', less_volume_headroom: 'Same count and fit score, but less volume reserve than the recommendation',
  estimate_only: 'Approximate plan. Packing, individual weights, door clearance and actual equipment limits require confirmation. No 3D loading guarantee.',
  availability_unknown: 'Route and carrier availability are not verified.', cost_proxy: 'Cost uses container count only; prices are not available.',
  unit_dimensions_unknown: 'Individual dimensions are missing or describe the whole shipment. The final count may increase.',
  cargo_compatibility_unknown: 'Cargo compatibility requires confirmation.', pallet_fit_unknown: 'Pallet layout is not verified. Pieces are not assumed to be pallets.',
  hs_not_handling_proof: 'HS codes give commodity context, not handling approval.', weight_volume_required: 'Enter total weight (kg) and volume (CBM) to calculate options.',
  special_equipment_review: 'Special cargo needs equipment review (e.g. reefer, open top or flat rack). Ordinary dry-container recommendations are withheld.',
  no_dimension_fit: 'The recorded units do not fit the checked dry-container doors, dimensions or payload. Review special equipment and individual weights.',
  volume_conflict: 'Unit dimensions imply a higher total volume than stated. The calculation uses that higher volume; confirm the discrepancy.',
};
const de: typeof en = {
  title: 'Containerempfehlungen', recommended: 'Empfohlen', alternative: 'Alternative', match: 'geschätzte Eignung',
  coverage: 'Abdeckung der bewerteten Daten', copy: 'In das Containerfeld kopieren', selected: 'Im Containerfeld', field: 'Containerfeld',
  note: 'Hinweis', formula: 'Formel und Erklärung', loading: 'Empfehlungen werden berechnet…', failed: 'Empfehlungen konnten nicht geladen werden.', retry: 'Erneut versuchen',
  unknown: 'Nicht geprüft', volume: 'Volumenauslastung', weight: 'Nutzlastauslastung', source: 'Containerabmessungen',
  advice: 'Bis zu drei Optionen. Kopieren Sie die gewünschte Option; Empfehlungen ändern das Containerfeld nicht automatisch.',
  scoreFormula: 'Bewertung = Σ(Wert × Gewichtung) / Σ(bekannte Gewichtungen). Unbekannte Faktoren werden ausgeschlossen. Planungswert, keine Wahrscheinlichkeit.',
  countFormula: 'Anzahl = max(aufrunden(CBM / nutzbare CBM), aufrunden(kg / Planungsnutzlast), aufrunden(Stückzahl / Bodenplätze), sofern bekannt).',
  countProxy: 'Kostenindikator = 100 × kleinste Containeranzahl / diese Anzahl. Bei Gleichstand: weniger Container, dann mehr Volumenreserve. Kein Preisvergleich.',
  volumeFit: 'Volumeneignung', weightFit: 'Gewichtseignung', dimensionFit: 'Abmessungen', palletFit: 'Palettenanordnung', cargoCompatibility: 'Wareneignung',
  routeAvailability: 'Routenverfügbarkeit', carrierAvailability: 'Verfügbarkeit beim Frachtführer', costEfficiency: 'Kosteneffizienz (Anzahlindikator)',
  volume_sufficient: 'Ausreichendes geschätztes Volumen', weight_within_limit: 'Gewicht innerhalb der Planungsnutzlast', general_cargo_suitable: 'Für das angegebene Stückgut geeignet',
  upright_floor_fit: 'Identische aufrechte Einheiten passen ohne Stapelung in das geschätzte Bodenraster', minimum_container_count: 'Geringste geschätzte Containeranzahl',
  more_containers: 'Mehr Container als bei der empfohlenen Option erforderlich', less_volume_headroom: 'Gleiche Anzahl und Bewertung, aber weniger Volumenreserve',
  estimate_only: 'Ungefähre Planung. Verpackung, Einzelgewichte, Türdurchgang und tatsächliche Containergrenzen bestätigen lassen. Keine 3D-Beladungsgarantie.',
  availability_unknown: 'Route und Verfügbarkeit beim Frachtführer sind nicht geprüft.', cost_proxy: 'Kostenindikator basiert nur auf der Containeranzahl; Preise fehlen.',
  unit_dimensions_unknown: 'Einzelabmessungen fehlen oder beschreiben die gesamte Sendung. Die endgültige Anzahl kann höher sein.',
  cargo_compatibility_unknown: 'Wareneignung muss bestätigt werden.', pallet_fit_unknown: 'Palettenanordnung nicht geprüft. Stückzahlen gelten nicht automatisch als Paletten.',
  hs_not_handling_proof: 'HS-Codes beschreiben Waren, bestätigen aber keine Handhabungsfreigabe.', weight_volume_required: 'Gesamtgewicht (kg) und Volumen (CBM) für die Berechnung eingeben.',
  special_equipment_review: 'Spezialgüter erfordern eine Ausrüstungsprüfung (z. B. Kühlcontainer, Open Top oder Flat Rack). Keine Empfehlung für gewöhnliche Trockencontainer.',
  no_dimension_fit: 'Die erfassten Einheiten passen nicht zu Türen, Abmessungen oder Nutzlast der geprüften Trockencontainer. Spezialausrüstung und Einzelgewichte prüfen.',
  volume_conflict: 'Einzelabmessungen ergeben ein höheres Gesamtvolumen als angegeben. Die Berechnung nutzt das höhere Volumen; Abweichung prüfen.',
};
const bs: typeof en = {
  title: 'Preporuke kontejnera', recommended: 'Preporučeno', alternative: 'Alternativa', match: 'procijenjeno podudaranje',
  coverage: 'Pokrivenost ocijenjenih podataka', copy: 'Kopiraj u polje kontejnera', selected: 'U polju kontejnera', field: 'Polje kontejnera',
  note: 'Napomena', formula: 'Formula i objašnjenje', loading: 'Izračun preporuka…', failed: 'Preporuke nije moguće učitati.', retry: 'Pokušaj ponovo',
  unknown: 'Nije provjereno', volume: 'Iskorištenost zapremine', weight: 'Iskorištenost nosivosti', source: 'Dimenzije kontejnera',
  advice: 'Do tri opcije. Kopirajte željenu opciju; preporuke ne mijenjaju polje kontejnera automatski.',
  scoreFormula: 'Ocjena = Σ(ocjena × ponder) / Σ(poznatih pondera). Nepoznati faktori se izostavljaju. Ovo je planska ocjena, a ne vjerovatnoća.',
  countFormula: 'Broj = max(zaokruži naviše(CBM / korisni CBM), zaokruži naviše(kg / planska nosivost), zaokruži naviše(komadi / mjesta na podu) kada su poznati).',
  countProxy: 'Procjena troška = 100 × najmanji broj kontejnera / ovaj broj. Kod iste ocjene prednost ima manji broj kontejnera, zatim veća rezerva zapremine. Ovo nije poređenje cijena.',
  volumeFit: 'Kapacitet zapremine', weightFit: 'Kapacitet nosivosti', dimensionFit: 'Usklađenost dimenzija', palletFit: 'Raspored paleta', cargoCompatibility: 'Kompatibilnost robe',
  routeAvailability: 'Dostupnost na ruti', carrierAvailability: 'Dostupnost kod prijevoznika', costEfficiency: 'Troškovna efikasnost (prema broju)',
  volume_sufficient: 'Dovoljna procijenjena zapremina', weight_within_limit: 'Težina unutar planske nosivosti', general_cargo_suitable: 'Pogodno za navedenu opću robu',
  upright_floor_fit: 'Jednaki uspravni komadi stanu u procijenjeni podni raspored bez slaganja', minimum_container_count: 'Najmanji procijenjeni broj kontejnera',
  more_containers: 'Potreban je veći broj kontejnera nego kod preporučene opcije', less_volume_headroom: 'Isti broj i ocjena, ali manja rezerva zapremine od preporučene opcije',
  estimate_only: 'Približan plan. Potrebno je potvrditi pakovanje, pojedinačne težine, prolaz kroz vrata i ograničenja konkretnog kontejnera. Nije garancija 3D utovara.',
  availability_unknown: 'Dostupnost na ruti i kod prijevoznika nije provjerena.', cost_proxy: 'Procjena troška koristi samo broj kontejnera; cijene nisu dostupne.',
  unit_dimensions_unknown: 'Pojedinačne dimenzije nedostaju ili opisuju cijeli teret. Konačan broj može biti veći.',
  cargo_compatibility_unknown: 'Potrebno je potvrditi kompatibilnost robe.', pallet_fit_unknown: 'Raspored paleta nije provjeren. Komadi se ne smatraju automatski paletama.',
  hs_not_handling_proof: 'HS kodovi opisuju robu, ali ne potvrđuju uslove rukovanja.', weight_volume_required: 'Unesite ukupnu težinu (kg) i zapreminu (CBM) za izračun opcija.',
  special_equipment_review: 'Posebna roba zahtijeva provjeru opreme (npr. rashladni, otvoreni ili platformni kontejner). Obični suhi kontejneri se ne preporučuju.',
  no_dimension_fit: 'Navedeni komadi ne odgovaraju vratima, dimenzijama ili nosivosti provjerenih suhih kontejnera. Provjerite posebnu opremu i pojedinačne težine.',
  volume_conflict: 'Pojedinačne dimenzije daju veću ukupnu zapreminu od navedene. Izračun koristi veću zapreminu; provjerite razliku.',
};
export const containerRecommendationText = (lang?: string | null): typeof en => lang === 'bs' ? bs : lang === 'de' ? de : en;
