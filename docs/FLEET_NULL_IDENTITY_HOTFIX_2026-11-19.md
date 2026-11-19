# Globalna flota — bijela stranica nakon učitavanja modela

Uzrok reproduciran prije ispravke: API vozilo s `make:null`, `model:null`, `features:null` pokreće `vehicleModelSpec` → `vehicleSeriesProfile` → `normalize(null)` i baca `Cannot read properties of null (reading 'normalize')`. Podrazumijevana vrijednost argumenta štitila je samo `undefined`. Isti kod koristile su sličice u tabeli, pa je izuzetak mogao oboriti cijelu React aplikaciju čim podaci stignu, nezavisno od WebGL podrške.

Ispravka prihvata nullable API identitet i nepoznate/neispravne vrijednosti tretira kao generički profil. Ne mijenja pohranjena vozila. Zajednički VehiclePreview postavlja ErrorBoundary i Suspense oko 3D modula u floti, izboru vozila i primopredaji. Greška lazy importa ili prikaza izolirana je na pregled vozila i prikazuje 2D ilustraciju. Greška GPU rendera, resizea ili gubitak WebGL konteksta zaustavlja zakazano iscrtavanje i isključuje kontrole uz 2D fallback.

Regresijski test je prvo pao s tačnom navedenom porukom, zatim prošao nakon ispravke. Paket od 18 testova uključuje nullable identitet, stvarnu Three.js geometriju starog vozila bez proizvođača/modela, sva 77 cestovna prijedloga i SVG prikaze. TypeScript i Vite build provjeravaju integraciju; to nije zamjena za nezavisan produkcijski pregled korisničke interakcije.
