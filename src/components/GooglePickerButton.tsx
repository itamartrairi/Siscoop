import React, { useState } from 'react';
import { openGooglePicker, PickedGoogleFile } from '../services/googlePickerService';
import { Cloud, Loader2 } from 'lucide-react';

export interface GooglePickerButtonProps {
  onFilesSelected: (files: PickedGoogleFile[]) => void;
  viewType?: 'ALL' | 'SPREADSHEETS' | 'DOCS' | 'PDFS' | 'IMAGES';
  title?: string;
  allowMultiSelect?: boolean;
  label?: string;
  buttonText?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  id?: string;
}

export const GooglePickerButton: React.FC<GooglePickerButtonProps> = ({
  onFilesSelected,
  viewType = 'ALL',
  title = 'Selecionar arquivo no Google Drive',
  allowMultiSelect = false,
  label,
  buttonText,
  className = '',
  variant = 'secondary',
  id = 'btn-google-picker'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayText = buttonText || label || 'Google Drive';

  const handleClick = async () => {
    try {
      setLoading(true);
      setError(null);
      await openGooglePicker({
        viewType: viewType as 'ALL' | 'SPREADSHEETS' | 'DOCS' | 'PDFS' | 'IMAGES',
        title,
        allowMultiSelect,
        onPick: (files) => {
          setLoading(false);
          onFilesSelected(files);
        },
        onCancel: () => {
          setLoading(false);
        }
      });
    } catch (err: any) {
      console.error('Google Picker error:', err);
      setError(err?.message || 'Erro ao abrir Google Picker');
      setLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm';
      case 'outline':
        return 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';
      case 'compact':
        return 'px-2 py-1 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg';
      case 'secondary':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm';
    }
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        id={id}
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-2 font-medium transition-all rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          variant !== 'compact' ? 'px-3.5 py-2 text-xs sm:text-sm' : ''
        } ${getVariantStyles()} ${className}`}
        title="Abrir Google Picker para selecionar arquivos do Google Drive"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
        )}
        <span>{loading ? 'Conectando...' : displayText}</span>
      </button>
      {error && (
        <span className="text-[11px] text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
};
