'use client'
import { useEffect, useState } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapaPlanoProps { onCountryClick?: (nomePais: string) => void; }

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => { if (bounds) { map.fitBounds(bounds, { padding: [20, 20], maxZoom: 6 }); } }, [bounds, map]);
  return null;
}

export default function MapaPlano({ onCountryClick }: MapaPlanoProps) {
  const [dadosMapa, setDadosMapa] = useState<any>(null);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);

  useEffect(() => {
    async function carregarMapa() {
      try {
        const res = await fetch('/meu_mapa_final.json?t=' + Date.now());
        if (!res.ok) throw new Error(`Erro ao carregar mapa: ${res.status}`);
        const data = await res.json();
        setDadosMapa(data);
      } catch (err) { console.error('❌ Erro ao carregar JSON:', err); }
    }
    carregarMapa();
  }, []);

  if (!dadosMapa) return <div className="flex items-center justify-center h-full text-white/50">Carregando...</div>;

  const onEachCountry = (feature: any, layer: L.Layer) => {
    const nome = feature.properties?.name || 'Desconhecido';
    layer.on({
      click: () => { if (onCountryClick) onCountryClick(nome); setBounds((layer as L.Polygon).getBounds()); }
    });
    layer.bindTooltip(nome, { sticky: true });
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      
      {/* Fundo escuro com grade sutil */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0f18',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        zIndex: 0
      }} />

      <MapContainer
        center={[0, 20]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: 'transparent', position: 'relative', zIndex: 1 }}
        zoomControl={false}
      >
        {/* 🗺️ Geojson com estilização de borda camuflada */}
        <GeoJSON
          data={dadosMapa}
          onEachFeature={onEachCountry}
          style={(feature) => {
            const cor = feature?.properties?.cor || '#4a4a4a';
            return {
              color: cor,           // A borda recebe a MESMA cor do país
              weight: 0.8,          // Espessura fina
              opacity: 0.4,         // Opacidade mais baixa para sumir na cor sólida
              fillColor: cor,
              fillOpacity: 0.95,
            };
          }}
        />

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}