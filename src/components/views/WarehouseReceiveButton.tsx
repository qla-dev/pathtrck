import { useEffect, useState } from 'react';
import { ArrowUpFromLine, Loader2, PackageCheck } from 'lucide-react';

import { ui } from '../../i18n';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { api } from '../../services/api';
import { Language } from '../../types';
import { Button } from '../ui/Button';

type MovementRow = Record<string, unknown>;

export const WarehouseReceiveButton = ({
  movementId,
  movement,
  lang,
  className,
  onReceived,
}: {
  movementId: string | null;
  movement?: MovementRow | null;
  lang: Language;
  className?: string;
  onReceived?: (movement: MovementRow) => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [record, setRecord] = useState<MovementRow | null>(movement ?? null);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    if (movement !== undefined) {
      setRecord(movement);
      return undefined;
    }
    if (!movementId) {
      setRecord(null);
      return undefined;
    }
    let cancelled = false;
    setRecord(null);
    void api.warehouseMovements.get(movementId)
      .then((response) => { if (!cancelled) setRecord(response.data); })
      .catch(() => { if (!cancelled) setRecord(null); });
    return () => { cancelled = true; };
  }, [movement, movementId]);

  const direction = record?.direction === 'outbound' ? 'outbound' : 'inbound';
  const canComplete = movementId
    && ['inbound', 'outbound'].includes(String(record?.direction || ''))
    && !['completed', 'cancelled'].includes(String(record.status || ''));
  if (!canComplete) return null;

  const receiveNow = async () => {
    if (receiving) return;
    const isOutbound = direction === 'outbound';
    const confirmed = await confirmAction({
      title: isOutbound
        ? u('warehouseDocks.dispatchNowTitle', 'Dispatch these goods now?')
        : u('warehouseDocks.receiveNowTitle', 'Receive these goods now?'),
      text: isOutbound
        ? u('warehouseDocks.dispatchNowText', 'The outbound movement will be completed now and the goods removed from warehouse occupancy.')
        : u('warehouseDocks.receiveNowText', 'The inbound movement will be completed now and the goods added to warehouse occupancy.'),
      confirmText: isOutbound
        ? u('warehouseDocks.dispatchNow', 'Dispatch now')
        : u('warehouseDocks.receiveNow', 'Receive now'),
    });
    if (!confirmed) return;

    setReceiving(true);
    try {
      const response = await api.warehouseMovements.update(movementId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      setRecord(response.data);
      onReceived?.(response.data);
      void showSuccess(
        isOutbound
          ? u('warehouseDocks.dispatchedTitle', 'Goods dispatched')
          : u('warehouseDocks.receivedTitle', 'Goods received'),
        isOutbound
          ? u('warehouseDocks.dispatchedText', 'The outbound movement is complete and warehouse occupancy has been updated.')
          : u('warehouseDocks.receivedText', 'The inbound movement is complete and warehouse occupancy has been updated.'),
      );
    } catch (error) {
      void showError(
        isOutbound
          ? u('warehouseDocks.dispatchFailed', 'The goods could not be dispatched')
          : u('warehouseDocks.receiveFailed', 'The goods could not be received'),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setReceiving(false);
    }
  };

  return (
    <Button className={className} disabled={receiving} onClick={() => void receiveNow()}>
      {receiving
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : direction === 'outbound'
          ? <ArrowUpFromLine className="mr-2 h-4 w-4" />
          : <PackageCheck className="mr-2 h-4 w-4" />}
      {direction === 'outbound'
        ? u('warehouseDocks.dispatchNow', 'Dispatch now')
        : u('warehouseDocks.receiveNow', 'Receive now')}
    </Button>
  );
};
