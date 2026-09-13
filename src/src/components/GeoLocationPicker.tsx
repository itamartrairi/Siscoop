import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  ExternalLink, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface GeoLocationPickerProps {
  latitude?: number;
  longitude?: number;
  pontoReferencia?: string;
  addressQuery?: string;
  onChange: (geo: { latitude: number; longitude: number; pontoReferencia?: string }) => void;
  title?: string;
  themeColor?: 'emerald' | 'rose' | 'blue' | 'amber';
  readOnly?: boolean;
}

export const GeoLocationPicker: React.FC<GeoLocationPickerProps> = ({
  latitude,
  longitude,
  pontoReferencia = '',
  addressQuery = '',
  onChange,
  title = 'Localização Geográfica e Coordenadas GPS',
  themeColor = 'emerald',
  readOnly = false
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(true);

  const currentLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : null;
  const currentLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : null;
  const hasCoordinates = currentLat !== null && currentLng !== null && (currentLat !== 0 || currentLng !== 0);

  const themeClasses = {
    emerald: {
      border: 'border-emerald-200 dark:border-emerald-800/60',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      outlineBtn: 'border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
      icon: 'text-emerald-600 dark:text-emerald-400',
      focus: 'focus:ring-emerald-500'
    },
    rose: {
      border: 'border-rose-200 dark:border-rose-800/60',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
      btn: 'bg-rose-700 hover:bg-rose-800 text-white',
      outlineBtn: 'border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30',
      icon: 'text-rose-700 dark:text-rose-400',
      focus: 'focus:ring-rose-500'
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-800/60',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
      outlineBtn: 'border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400',
      focus: 'focus:ring-blue-500'
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-800/60',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
      outlineBtn: 'border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30',
      icon: 'text-amber-600 dark:text-amber-400',
      focus: 'focus:ring-amber-500'
    }
  }[themeColor];

  // Capturar GPS nativo do dispositivo
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        message: 'Seu navegador ou dispositivo não possui suporte a geolocalização por GPS.'
      });
      return;
    }

    setIsLocating(true);
    setFeedback({
      type: 'info',
      message: 'Obtendo sinal GPS de alta precisão...'
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy || 0);

        onChange({
          latitude: lat,
          longitude: lng,
          pontoReferencia: pontoReferencia || `Coordenadas capturadas via GPS (Precisão: ±${accuracy}m)`
        });

        setIsLocating(false);
        setFeedback({
          type: 'success',
          message: `Coordenadas obtidas com sucesso! Precisão de aproximadamente ±${accuracy} metros.`
        });
      },
      (err) => {
        setIsLocating(false);
        let errorMsg = 'Não foi possível capturar a localização por GPS.';
        if (err.code === 1) {
          errorMsg = 'Permissão de localização negada pelo usuário no navegador.';
        } else if (err.code === 2) {
          errorMsg = 'Posição GPS indisponível no momento.';
        } else if (err.code === 3) {
          errorMsg = 'Tempo limite esgotado ao buscar sinal GPS.';
        }
        setFeedback({ type: 'error', message: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // Buscar coordenadas via Geocoding (Nominatim / OSM) baseado no endereço digitado
  const handleGeocodeAddress = async () => {
    const query = addressQuery.trim();
    if (!query) {
      setFeedback({
        type: 'error',
        message: 'Preencha o logradouro, bairro, cidade ou CEP antes de buscar coordenadas.'
      });
      return;
    }

    setIsGeocoding(true);
    setFeedback({
      type: 'info',
      message: `Localizando coordenadas para: "${query}"...`
    });

    try {
      // Clean query and add country context if missing
      const fullQuery = query.toLowerCase().includes('brasil') || query.toLowerCase().includes('brazil')
        ? query
        : `${query}, Ceará, Brasil`;

      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullQuery)}`;
      const response = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9'
        }
      });

      if (!response.ok) {
        throw new Error('Falha no serviço de geocodificação.');
      }

      const results = await response.json();
      if (results && results.length > 0) {
        const found = results[0];
        const lat = parseFloat(parseFloat(found.lat).toFixed(6));
        const lng = parseFloat(parseFloat(found.lon).toFixed(6));

        onChange({
          latitude: lat,
          longitude: lng,
          pontoReferencia: pontoReferencia || found.display_name?.split(',').slice(0, 3).join(',')
        });

        setFeedback({
          type: 'success',
          message: `Localização encontrada: ${found.display_name?.split(',').slice(0, 2).join(',')}`
        });
      } else {
        // Fallback aproximado para Trairi / Ceará caso não encontre rua exata
        setFeedback({
          type: 'error',
          message: 'Endereço específico não localizado no mapa. Você pode inserir as coordenadas manualmente ou usar o GPS.'
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Erro ao consultar serviço de mapa online. Insira as coordenadas manualmente.'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // URLs de mapa
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`
    : addressQuery 
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
      : 'https://maps.google.com';

  const wazeUrl = hasCoordinates
    ? `https://waze.com/ul?ll=${currentLat},${currentLng}&navigate=yes`
    : null;

  // URL iframe embed OpenStreetMap com pin
  const embedMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.008}%2C${currentLat - 0.006}%2C${currentLng + 0.008}%2C${currentLat + 0.006}&layer=mapnik&marker=${currentLat}%2C${currentLng}`
    : null;

  return (
    <div className={`p-4 rounded-2xl border ${themeClasses.border} ${themeClasses.bg} space-y-3.5 transition-all shadow-xs`}>
      {/* Header com Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs border ${themeClasses.border}`}>
            <MapPin className={`w-4 h-4 ${themeClasses.icon}`} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs tracking-tight">
              {title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Coordenadas geográficas para roteirização, mapas de entrega e vistorias de campo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasCoordinates ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold ${themeClasses.badge}`}>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Compass className="w-3 h-3 text-slate-500" />
              Coordenadas não definidas
            </span>
          )}

          {hasCoordinates && (
            <button
              type="button"
              onClick={() => setShowMapPreview(!showMapPreview)}
              title={showMapPreview ? 'Ocultar prévia do mapa' : 'Exibir prévia do mapa'}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1 shadow-2xs"
            >
              {showMapPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Ações de Busca e Captura GPS */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isLocating}
            onClick={handleCaptureGps}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${themeClasses.btn} ${
              isLocating ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'
            }`}
          >
            {isLocating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            {isLocating ? 'Capturando GPS...' : 'Capturar GPS Atual'}
          </button>

          {addressQuery && (
            <button
              type="button"
              disabled={isGeocoding}
              onClick={handleGeocodeAddress}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white dark:bg-slate-800 border transition-all shadow-2xs ${themeClasses.outlineBtn} ${
                isGeocoding ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50'
              }`}
            >
              {isGeocoding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              {isGeocoding ? 'Localizando no mapa...' : 'Buscar Coordenadas pelo Endereço'}
            </button>
          )}

          {hasCoordinates && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all shadow-2xs ml-auto"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
              Abrir no Google Maps
            </a>
          )}

          {wazeUrl && (
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 transition-all shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-600" />
              Waze
            </a>
          )}
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200' 
            : feedback.type === 'error'
              ? 'bg-rose-100/80 border-rose-300 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
              : 'bg-blue-100/80 border-blue-300 text-blue-900 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200'
        }`}>
          {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
          {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />}
          {feedback.type === 'info' && <Compass className="w-4 h-4 text-blue-700 shrink-0 mt-0.5 animate-pulse" />}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-slate-700 text-xs px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Inputs de Latitude, Longitude e Ponto de Referência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
            Latitude (Graus Decimais)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              readOnly={readOnly}
              placeholder="-3.376800"
              value={latitude !== undefined && latitude !== null ? latitude : ''}
              onChange={e => {
                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                onChange({
                  latitude: isNaN(val) ? 0 : val,
                  longitude: currentLng || 0,
                  pontoReferencia
                });
              }}
              className={`w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 ${themeClasses.focus} ${readOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">LAT</span>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
            Longitude (Graus Decimais)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              readOnly={readOnly}
              placeholder="-39.268900"
              value={longitude !== undefined && longitude !== null ? longitude : ''}
              onChange={e => {
                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                onChange({
                  latitude: currentLat || 0,
                  longitude: isNaN(val) ? 0 : val,
                  pontoReferencia
                });
              }}
              className={`w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 ${themeClasses.focus} ${readOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">LNG</span>
          </div>
        </div>

        <div className="sm:col-span-2 md:col-span-1">
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
            Ponto de Referência / Acesso
          </label>
          <input
            type="text"
            readOnly={readOnly}
            placeholder="Ex: Próximo à praça / Estrada vicinal km 4"
            value={pontoReferencia || ''}
            onChange={e => {
              onChange({
                latitude: currentLat || 0,
                longitude: currentLng || 0,
                pontoReferencia: e.target.value
              });
            }}
            className={`w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 ${themeClasses.focus} ${readOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {/* Embed Interativo do Mapa (OpenStreetMap) */}
      {hasCoordinates && showMapPreview && embedMapUrl && (
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-900 relative">
          <iframe
            title="Visualização da Localização no Mapa"
            src={embedMapUrl}
            className="w-full h-44 sm:h-52 border-0 rounded-xl"
            loading="lazy"
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">Pin fixado em: <strong>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</strong></span>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold hover:underline shrink-0 ml-2"
            >
              <Maximize2 className="w-3 h-3" />
              Ampliar
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
