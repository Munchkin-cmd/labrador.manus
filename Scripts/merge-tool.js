const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// ⚠️ COPIE E COLE SUA LISTA DE PAÍSES AQUI
const REGRAS_FUSAO = [
    // ... sua lista imensa aqui ...
];

async function gerarMapaUnificado() {
  console.log("📂 Lendo mapa base...");
  
  const rawData = fs.readFileSync(path.join(__dirname, 'world_base.geojson'), 'utf-8');
  const geoJson = JSON.parse(rawData);
  const nomeProp = "NAME";

  const todosNomesOriginais = REGRAS_FUSAO.flatMap(r => r.paisesOriginais);
  const featuresMantidas = geoJson.features.filter(f => !todosNomesOriginais.includes(f.properties[nomeProp]));

  for (const regra of REGRAS_FUSAO) {
    console.log(`🔧 Criando: ${regra.novoNome}...`);
    
    const featuresParaUnir = geoJson.features
      .filter(f => regra.paisesOriginais.includes(f.properties[nomeProp]))
      .map(f => f.geometry);
    
    if (featuresParaUnir.length === 0) continue;

    let geometriaUnida = featuresParaUnir[0];
    for (let i = 1; i < featuresParaUnir.length; i++) {
      try {
        // No JavaScript puro, o union funciona sem erros de tipo!
        const featureA = turf.feature(geometriaUnida);
        const featureB = turf.feature(featuresParaUnir[i]);
        
        const uniao = turf.union(featureA, featureB);
        if (uniao?.geometry) {
          geometriaUnida = uniao.geometry; 
        }
      } catch (e) { 
        console.warn(`Erro em ${regra.novoNome}:`, e);
      }
    }

    featuresMantidas.push({
      type: "Feature",
      properties: { name: regra.novoNome, id: regra.novoNome.replace(/\s+/g, '_').toLowerCase() },
      geometry: geometriaUnida
    });
  }

  const novoGeoJson = { type: "FeatureCollection", features: featuresMantidas };

  fs.writeFileSync(
    path.join(__dirname, '../public/meu_mapa_final.json'), 
    JSON.stringify(novoGeoJson, null, 2)
  );
  
  console.log("✅ Mapa unificado gerado em 'public/meu_mapa_final.json'!");
}

gerarMapaUnificado();