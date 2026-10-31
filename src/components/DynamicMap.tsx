'use client'

import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface DynamicMapProps {
  onCountryClick?: (nomePais: string) => void;
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => { if (bounds) { map.fitBounds(bounds, { padding: [20, 20], maxZoom: 5 }); } }, [bounds, map]);
  return null;
}

// 🎨 CORES SIMULADAS DE PAÍSES (Para você ver a mágica acontecer)
const CORES_FACCOES: Record<string, string> = {
  'Estados Unidos': '#22c55e', // Verde brilhante (como na sua imagem)
  'Canadá': '#22c55e',         // Simulando que o Canadá foi anexado pelos EUA!
  'Rússia': '#3b82f6',         // Azul
  'Brasil': '#eab308',         // Amarelo
  'China': '#ef4444',          // Vermelho
  'União Europeia': '#8b5cf6', // Roxo
}

export default function DynamicMap({ onCountryClick }: DynamicMapProps) {
  const [dadosMapa, setDadosMapa] = useState<any>(null);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  useEffect(() => {
    async function carregarMapa() {
      try {
        // ✅ Certifique-se de que este arquivo tem os países originais (sem fusão)
        const res = await fetch('/meu_mapa_final.json?t=' + Date.now());
        if (!res.ok) throw new Error(`Erro ao carregar mapa: ${res.status}`);
        const data = await res.json();
        setDadosMapa(data);
      } catch (err) { console.error('❌ Erro ao carregar JSON:', err); }
    }
    carregarMapa();
  }, []);

  if (!dadosMapa) return <div className="flex items-center justify-center h-full text-white/50">Carregando mapa...</div>;

  const onEachCountry = (feature: any, layer: L.Layer) => {
    const nome = feature.properties?.name || 'Desconhecido';
    layer.on({
      click: () => { if (onCountryClick) onCountryClick(nome); setBounds((layer as L.Polygon).getBounds()); }
    });
    layer.bindTooltip(nome, { sticky: true, className: 'bg-black/80 text-white border-none rounded px-2 py-1 text-xs' });
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Fundo espacial escuro */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#080b12',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        zIndex: 0
      }} />

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: 'transparent', position: 'relative', zIndex: 1 }}
        zoomControl={false}
      >
        <GeoJSON
          data={dadosMapa}
          onEachFeature={onEachCountry}
          style={(feature) => {
            const nomePais = feature?.properties?.name || '';
            
            // ✅ LÓGICA DE CORES: Puxa a cor da facção, se não tiver, usa um cinza escuro
            const cor = CORES_FACCOES[nomePais] || '#1f2937'; 

            return {
              color: '#0f172a', // Cor da borda (bem escura)
              weight: 1,        // Borda fina
              opacity: 0.8,
              fillColor: cor,   // Cor do território
              fillOpacity: 0.7, // Transparência para ver o fundo
            };
          }}
        />
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}