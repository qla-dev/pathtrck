import { useRef, useState, type DragEvent } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import { api, ApiError, LoadScanResult } from '../../services/api';

type DocumentDropzoneProps = {
  open: boolean;
  onClose: () => void;
  onScanned: (result: LoadScanResult, imageDataUrl: string) => void;
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

export const DocumentDropzone = ({ open, onClose, onScanned }: DocumentDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setIsDragging(false);
    setIsScanning(false);
    setPreview(null);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image of the document (photo or screenshot).');
      return;
    }
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);
      setIsScanning(true);
      const base64 = dataUrl.split(',')[1] || '';
      const response = await api.loads.scan([{ base64, mimeType: file.type }]);
      onScanned(response.data, dataUrl);
      reset();
    } catch (scanError) {
      setIsScanning(false);
      setError(scanError instanceof ApiError ? scanError.message : 'The document could not be read. Please try again.');
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col bg-slate-950/92 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Fill up with AI</h3>
            <p className="text-xs text-white/60">Drop a shipping order, rate confirmation, or manifest photo</p>
          </div>
        </div>
        <button
          onClick={close}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !isScanning && inputRef.current?.click()}
          className={`flex w-full max-w-xl flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 sm:p-16 text-center transition-colors ${
            isScanning ? 'cursor-default' : 'cursor-pointer'
          } ${isDragging ? 'border-primary bg-primary/10' : 'border-white/25 bg-white/[0.03] hover:border-white/40'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Uploaded document" className="max-h-56 rounded-2xl object-contain shadow-lg" />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/60">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <UploadCloud className="h-8 w-8 text-white/70" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-base font-bold text-white">
              {isScanning ? 'Reading the document…' : 'Drop the document here'}
            </p>
            <p className="text-sm text-white/50">
              {isScanning ? 'This can take a few seconds.' : 'or click to browse a photo or screenshot'}
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
