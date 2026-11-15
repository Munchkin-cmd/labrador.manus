'use client'

import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import * as turf from '@turf/turf' 
import { supabase } from '@/lib/supabase/client' 
import { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson'

interface DynamicMapProps {
  onCountryClick?: (nomePais: string) => void;
  focusCountryName?: string | null;
  // ✅ NOVO: Prop que recebe os países filtrados
  filteredCountryNames?: string[]; 
}

type PolyFeature = Feature<Polygon | MultiPolygon>;

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => { if (bounds) { map.fitBounds(bounds, { padding: [20, 20], maxZoom: 5 }); } }, [bounds, map]);
  return null;
}

function MapFocusController({ focusName, data, onBoundsFound }: { focusName: string | null, data: any, onBoundsFound: (b: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!focusName || !data) return;
    
    const feature = data.features.find((f: any) => 
      f.properties?.NAME?.toLowerCase() === focusName.toLowerCase() || 
      f.properties?.ADMIN?.toLowerCase() === focusName.toLowerCase()
    );

    if (feature) {
      const layer = L.geoJSON(feature);
      const bounds = layer.getBounds();
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 4 });
      onBoundsFound(bounds);
    }
  }, [focusName, data, map, onBoundsFound]);

  return null;
}

function gerarCorAutomatica(id: number) {
  const hue = (id * 137.508) % 360;
  return `hsl(${hue}, 65%, 50%)`; 
}

type TerritoryData = Record<string, { id: number, cor: string, slug: string | null, nome: string }>;

export default function DynamicMap({ onCountryClick, focusCountryName, filteredCountryNames = [] }: DynamicMapProps) {
  const [dadosMapa, setDadosMapa] = useState<FeatureCollection<Polygon | MultiPolygon> | null>(null);
  const [territorios, setTerritorios] = useState<TerritoryData>({});
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [carregando, setCarregando] = useState(true);

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
    async function carregarDados() {
      setCarregando(true);
      try {
        const resMapa = await fetch('/mapa_original.json?t=' + Date.now());
        if (!resMapa.ok) throw new Error('Erro ao carregar o mapa original');
        
        const dataMapaOriginal = await resMapa.json() as FeatureCollection; 

        const { data: dbData, error } = await supabase
          .from('map_territories')
          .select(`
            territory_name,
            countries ( id, name, slug, color )
          `);

        if (error) throw error;

        const dict: TerritoryData = {};
        dbData?.forEach((item: any) => {
          const c = item.countries;
          if (c) {
            dict[item.territory_name] = {
              id: c.id,
              cor: c.color || gerarCorAutomatica(c.id),
              slug: c.slug,
              nome: c.name || 'Desconhecido'
            };
          }
        });

        setTerritorios(dict);

        const featuresPorDono: Record<string, PolyFeature[]> = {};
        
        dataMapaOriginal.features.forEach((f) => {
          if (f.geometry?.type !== 'Polygon' && f.geometry?.type !== 'MultiPolygon') return;

          const polyFeature = f as PolyFeature;
          let nome = polyFeature.properties?.NAME || '';
          
          if (nome.toUpperCase().includes('ANTARCTIC LANDS') || nome === 'Antarctica') {
            nome = 'Antarctica';
            polyFeature.properties = { ...polyFeature.properties, NAME: 'Antarctica' };
          }

          const info = dict[nome];
          const donoId = info?.id ? String(info.id) : `neutro_${nome}`;
          
          if (!featuresPorDono[donoId]) featuresPorDono[donoId] = [];
          featuresPorDono[donoId].push(polyFeature);
        });

        const featuresFinais: PolyFeature[] = [];

        Object.keys(featuresPorDono).forEach(donoId => {
          const grupo = featuresPorDono[donoId];
          
          if (donoId.startsWith('neutro_') || grupo.length === 1) {
            featuresFinais.push(...grupo);
            return;
          }

          try {
            const fc = turf.featureCollection(grupo); 
            const uniao = turf.union(fc);
            
            if (uniao) {
              const infoDono = dict[grupo[0].properties?.NAME || ''];
              uniao.properties = { 
                ...grupo[0].properties, 
                DONO_NOME: infoDono?.nome,
                DONO_COR: infoDono?.cor,
                DONO_SLUG: infoDono?.slug
              };
              featuresFinais.push(uniao);
            } else {
              featuresFinais.push(...grupo);
            }
          } catch (err) {
            console.warn(`Erro ao fundir territórios do dono ${donoId}:`, err);
            featuresFinais.push(...grupo);
          }
        });

        setDadosMapa({ type: 'FeatureCollection', features: featuresFinais });

      } catch (err) {
        console.error('❌ Erro ao carregar dados do banco:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  if (carregando || !dadosMapa) {
    return <div className="flex items-center justify-center h-full text-white/50 text-xs font-mono uppercase tracking-widest">Carregando mapa tático...</div>;
  }

  const onEachCountry = (feature: Feature, layer: L.Layer) => {
    let nomeGeo = feature.properties?.NAME || 'Desconhecido';
    
    if (nomeGeo.toUpperCase().includes('ANTARCTIC LANDS') || nomeGeo === 'Antarctica') {
      nomeGeo = 'Antarctica';
    }

    const donoNome = feature.properties?.DONO_NOME || territorios[nomeGeo]?.nome;
    const donoSlug = feature.properties?.DONO_SLUG || territorios[nomeGeo]?.slug;

    layer.on({
      click: () => { 
        if (onCountryClick) onCountryClick(donoNome || nomeGeo); 
        setBounds((layer as L.Polygon).getBounds()); 
      }
    });

    if (donoNome && donoSlug) {
      layer.bindTooltip(`
        <div class="flex flex-col gap-1">
          <a href="/game/pais/${donoSlug}" class="text-amber-400 font-bold text-sm hover:underline hover:text-amber-300 transition-colors">
            ${donoNome}
          </a>
        </div>
      `, { sticky: true, className: 'bg-black/90 border border-white/20 rounded px-3 py-2 shadow-xl' });
    } else {
      layer.bindTooltip(`
        <div class="flex flex-col">
          <span class="text-gray-300 font-bold text-sm tracking-wider uppercase">${nomeGeo}</span>
        </div>
      `, { sticky: true, className: 'bg-black/90 border border-white/20 rounded px-3 py-2 shadow-xl' });
    }
  };

  // ✅ Verifica se há algum filtro ativo
  const isFilterActive = filteredCountryNames.length > 0;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
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
          // ✅ Adicionado isFilterActive e filteredCountryNames.length na key para forçar a re-renderização quando o filtro mudar
          key={Object.keys(territorios).length + '-' + dadosMapa.features.length + '-' + isFilterActive + '-' + filteredCountryNames.length} 
          data={dadosMapa}
          onEachFeature={onEachCountry}
          style={(feature) => {
            if (!feature) return {};

            let nomePais = feature.properties?.NAME || '';
            
            if (nomePais.toUpperCase().includes('ANTARCTIC LANDS') || nomePais === 'Antarctica') {
              nomePais = 'Antarctica';
            }

            // Identifica o dono (para comparar com a lista de filtros)
            const donoNome = feature.properties?.DONO_NOME || territorios[nomePais]?.nome;
            const info = territorios[nomePais];
            
            // ✅ Lógica de Filtro Visual
            const isMatched = filteredCountryNames.includes(donoNome) || filteredCountryNames.includes(nomePais);

            if (nomePais === 'Antarctica') {
              return { color: '#0f172a', weight: 1, opacity: isFilterActive ? 0.2 : 0.8, fillColor: '#ffffff', fillOpacity: isFilterActive ? 0.1 : 0.75 };
            }

            // Se o filtro estiver ativo E este país não estiver na lista, ele fica "apagado"
            if (isFilterActive && !isMatched) {
              return {
                color: '#0f172a', // Borda escura
                weight: 0.5,
                opacity: 0.3,
                fillColor: '#111827', // Cinza escuro
                fillOpacity: 0.15, // Quase transparente
              };
            }

            // Se não há filtro (ou se o país passou no filtro), mostra a cor normal
            const cor = feature.properties?.DONO_COR || info?.cor || '#1f2937'; 

            return {
              color: '#0f172a',
              weight: 1.5,
              opacity: 1,
              fillColor: cor,
              fillOpacity: 0.85, // Aumentei um pouco a opacidade para destacar quem passou no filtro
            };
          }}
        />
        
        <MapFocusController focusName={focusCountryName || null} data={dadosMapa} onBoundsFound={setBounds} />
        
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}