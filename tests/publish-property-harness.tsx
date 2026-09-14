import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PublishPropery, type PublishDestination } from '../src/components/modals/PostLoadModal/PublishPropery';
import '../src/index.css';

const App = () => {
  const params = new URLSearchParams(location.search);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<PublishDestination>('exchange');
  const [warehouseId, setWarehouseId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [warehouseAdded, setWarehouseAdded] = useState(false);
  const [vehicleAdded, setVehicleAdded] = useState(false);
  const [result, setResult] = useState('');
  const warehouse = { id: 7, name: 'Test warehouse', city: 'Sarajevo', countryCode: 'BA', address: '', latitude: '', longitude: '' };
  return <>
    <button onClick={() => setOpen(true)}>Publish</button>
    <output>{result}</output>
    <PublishPropery open={open} lang="en" storage={params.has('storage')} transportLabel={params.has('storage') ? 'Storage' : 'Road'}
      destination={destination} onDestination={setDestination}
      warehouses={warehouseAdded ? [warehouse] : []} warehouseId={warehouseId} onWarehouse={w => setWarehouseId(String(w.id))}
      vehicles={vehicleAdded ? [{ id: 9, name: 'Test vehicle' }] : []} vehicleId={vehicleId} onVehicle={setVehicleId}
      loading={false} resourceError={false} onRetry={() => {}}
      onCreateWarehouse={() => setWarehouseAdded(true)} onCreateVehicle={() => setVehicleAdded(true)}
      busy={false} error="" onClose={() => setOpen(false)} onConfirm={() => { setResult(`${destination}:${warehouseId}:${vehicleId}`); setOpen(false); }}
    />
  </>;
};
const root = createRoot(document.getElementById('root')!);
if (new URLSearchParams(location.search).has('form')) {
  const { installLenaCatalog } = await import('../src/lib/lenaCatalog');
  installLenaCatalog(await (await fetch('/tests/publish-catalog.json')).json());
  const { PostLoadModal } = await import('../src/components/modals/PostLoadModal/PostLoadModal');
  const valid = new URLSearchParams(location.search).has('valid');
  const prefill = valid ? { loadTitle: 'Test shipment', pickupCity: 'Sarajevo', deliveryCity: 'Tuzla', weightKg: '1', supplierName: 'Test', supplierEmail: 'test@example.com', supplierPhone: '+38733123456' } : null;
  root.render(<PostLoadModal isOpen lang="en" initialPrefill={prefill} onClose={() => {}} />);
} else root.render(<App />);
