import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ PALETA DISTRIBUÍDA (Mantida como você aprovou)
const CORES_PARA_FUSAO: Record<string, string> = {
  'Canadá': '#2f4f4f', 'Estados Unidos': '#4169e1', 'México': '#d2691e', 
  'América Central': '#20b2aa', 'Caribe': '#ffb6c1',
  'Chile': '#b22222', 'Brasil': '#32cd32', 'Colômbia': '#8a2be2', 
  'Venezuela': '#dc143c', 'Mercosul': '#1e90ff', 'Guianas': '#8b4513', 'Andino': '#00ced1',
  'Império Dinarmaques': '#ff69b4', 'Rússia': '#800000', 'Ucrânia': '#ffa500',
  'Bielorrussia': '#8fbc8f', 'Irlanda': '#228b22', 'Reino Unido': '#483d8b',
  'Alemanha': '#7fff00', 'Suíça': '#ffdead', 'Hungria': '#dda0dd',
  'Áustria': '#ffb07c', 'Polônia': '#dc143c', 'Sérvia': '#db7093',
  'Bulgária': '#f4a460', 'Comunidade Nórdica': '#8a2be2', 'Benelux': '#ffd700',
  'França': '#708090', 'Comunidade Ibérica': '#ff4500', 'Itália': '#87ceeb',
  'Bálticos': '#a9a9a9', 'Balcãs Ocidentais': '#556b2f', 'Ilíria': '#ff6347',
  'Romênia': '#4682b4', 'Tchecoslováquia': '#cd853f', 'Grécia': '#b0e0e6',
  'Japão': '#e9967a', 'Myanmar': '#da70d6', 'Tailândia': '#ffefd5',
  'Filipinas': '#00bfff', 'Iraque': '#8b0000', 'Irã': '#f0e68c',
  'Mongólia': '#d3d3d3', 'Turquia': '#adff2f', 'Cáucaso': '#00fa9a',
  'Península Arábica': '#c71585', 'Levante': '#ffdab9', 'Israel': '#6495ed',
  'Reino Durrani': '#66cdaa', 'Ásia Turcomena': '#5f9ea0', 'China': '#b03060',
  'Taiwan': '#e6e6fa', 'Índia': '#ffdead', 'Himalaia': '#fa8072',
  'Indochina': '#a0522d', 'Índias Orientais': '#3cb371', 'Coreia': '#c0c0c0',
  'Comunidade Australiana': '#f08080',
  'Argélia': '#a52a2a', 'Mauritânia': '#c8a2c8', 'Marrocos': '#f5deb3',
  'Magrebe Oriental': '#bc8f8f', 'Vale do Nilo': '#00fa9a', 'Sahel': '#d2b48c',
  'Costa Ocidental': '#808080', 'Costa do Ouro': '#eebd82', 'Golfo da Guiné': '#b22222',
  'África Central Ocidental': '#9932cc', 'Angola': '#ffd700', 
  'República Democratica do Congo': '#2f4f4f', 'Chifre da África': '#deb887',
  'Grandes Lagos': '#ba55d3', 'Moçambique-Malawi': '#fa8072', 'Rodésia': '#daa520',
  'África Austral': '#a0522d', 'Índico Insular': '#90ee90'
};

// ✅ LISTA CORRIGIDA COM OS NOVOS NOMES DE ILHAS E ABREVIAÇÕES
const REGRAS_FUSAO: { novoNome: string; paisesOriginais: string[] }[] = [
  { novoNome: "Chile", paisesOriginais: ["Chile"] },
  { novoNome: "Brasil", paisesOriginais: ["Brazil"] },
  { novoNome: "Colômbia", paisesOriginais: ["Colombia"] },
  { novoNome: "Venezuela", paisesOriginais: ["Venezuela"] },
  { novoNome: "Mercosul", paisesOriginais: ["Argentina", "Paraguay", "Uruguay"] },
  { novoNome: "Guianas", paisesOriginais: ["Guyana", "Suriname", "French Guiana"] },
  { novoNome: "Andino", paisesOriginais: ["Peru", "Bolivia", "Ecuador"] },
  { novoNome: "Canadá", paisesOriginais: ["Canada", "Greenland"] },
  { novoNome: "Estados Unidos", paisesOriginais: ["United States of America"] },
  { novoNome: "México", paisesOriginais: ["Mexico"] },
  { novoNome: "América Central", paisesOriginais: ["Guatemala", "Honduras", "El Salvador", "Costa Rica", "Panama", "Nicaragua", "Belize"] },
  { novoNome: "Caribe", paisesOriginais: ["Cuba", "Dominican Rep.", "Haiti", "Jamaica", "Bahamas", "Trinidad and Tobago", "Barbados", "Antigua and Barbuda", "Dominica", "Grenada", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Puerto Rico"] }, // ✅ Porto Rico no Caribe
  { novoNome: "Império Dinarmaques", paisesOriginais: ["Denmark", "Iceland", "Norway"] },
  { novoNome: "Rússia", paisesOriginais: ["Russia"] },
  { novoNome: "Ucrânia", paisesOriginais: ["Ukraine"] },
  { novoNome: "Bielorrussia", paisesOriginais: ["Belarus"] },
  { novoNome: "Irlanda", paisesOriginais: ["Ireland"] },
  { novoNome: "Reino Unido", paisesOriginais: ["United Kingdom", "Falkland Is."] },
  { novoNome: "Alemanha", paisesOriginais: ["Germany"] },
  { novoNome: "Suíça", paisesOriginais: ["Switzerland"] },
  { novoNome: "Hungria", paisesOriginais: ["Hungary"] },
  { novoNome: "Áustria", paisesOriginais: ["Austria"] },
  { novoNome: "Polônia", paisesOriginais: ["Poland"] },
  { novoNome: "Sérvia", paisesOriginais: ["Serbia"] },
  { novoNome: "Bulgária", paisesOriginais: ["Bulgaria"] },
  { novoNome: "Comunidade Nórdica", paisesOriginais: ["Sweden", "Finland"] },
  { novoNome: "Benelux", paisesOriginais: ["Netherlands", "Belgium", "Luxembourg"] },
  { novoNome: "França", paisesOriginais: ["France", "Monaco"] },
  { novoNome: "Comunidade Ibérica", paisesOriginais: ["Portugal", "Cape Verde", "Spain", "Andorra"] },
  { novoNome: "Itália", paisesOriginais: ["Italy", "San Marino", "Vatican", "Malta"] },
  { novoNome: "Bálticos", paisesOriginais: ["Estonia", "Latvia", "Lithuania"] },
  { novoNome: "Balcãs Ocidentais", paisesOriginais: ["Slovenia", "Croatia", "Bosnia and Herz.", "Montenegro"] }, // ✅ Bósnia corrigida
  { novoNome: "Ilíria", paisesOriginais: ["Albania", "North Macedonia", "Kosovo"] },
  { novoNome: "Romênia", paisesOriginais: ["Romania", "Moldova"] },
  { novoNome: "Tchecoslováquia", paisesOriginais: ["Czechia", "Slovakia"] },
  { novoNome: "Grécia", paisesOriginais: ["Greece", "Cyprus", "N. Cyprus"] },
  { novoNome: "Japão", paisesOriginais: ["Japan"] },
  { novoNome: "Myanmar", paisesOriginais: ["Myanmar"] },
  { novoNome: "Tailândia", paisesOriginais: ["Thailand"] },
  { novoNome: "Filipinas", paisesOriginais: ["Philippines"] },
  { novoNome: "Iraque", paisesOriginais: ["Iraq"] },
  { novoNome: "Irã", paisesOriginais: ["Iran"] },
  { novoNome: "Mongólia", paisesOriginais: ["Mongolia"] },
  { novoNome: "Turquia", paisesOriginais: ["Turkey"] },
  { novoNome: "Cáucaso", paisesOriginais: ["Georgia", "Armenia", "Azerbaijan"] },
  { novoNome: "Península Arábica", paisesOriginais: ["Saudi Arabia", "Yemen", "Oman", "United Arab Emirates", "Qatar", "Kuwait", "Bahrain"] },
  { novoNome: "Levante", paisesOriginais: ["Syria", "Lebanon"] },
  { novoNome: "Israel", paisesOriginais: ["Israel", "Palestine", "Jordan"] },
  { novoNome: "Reino Durrani", paisesOriginais: ["Afghanistan", "Pakistan", "Tajikistan"] },
  { novoNome: "Ásia Turcomena", paisesOriginais: ["Turkmenistan", "Uzbekistan", "Kazakhstan", "Kyrgyzstan"] },
  { novoNome: "China", paisesOriginais: ["China"] },
  { novoNome: "Taiwan", paisesOriginais: ["Taiwan"] },
  { novoNome: "Índia", paisesOriginais: ["India", "Bangladesh", "Sri Lanka", "Maldives"] },
  { novoNome: "Himalaia", paisesOriginais: ["Nepal", "Bhutan"] },
  { novoNome: "Indochina", paisesOriginais: ["Laos", "Cambodia", "Vietnam"] },
  { novoNome: "Índias Orientais", paisesOriginais: ["Indonesia", "Papua New Guinea", "Malaysia", "Singapore", "Brunei", "Timor-Leste", "Solomon Is."] }, // ✅ Timor-Leste e Ilhas Salomão
  { novoNome: "Coreia", paisesOriginais: ["North Korea", "South Korea"] },
  { novoNome: "Argélia", paisesOriginais: ["Algeria"] },
  { novoNome: "Mauritânia", paisesOriginais: ["Mauritania"] },
  { novoNome: "Marrocos", paisesOriginais: ["Morocco", "W. Sahara"] },
  { novoNome: "Magrebe Oriental", paisesOriginais: ["Libya", "Tunisia"] },
  { novoNome: "Vale do Nilo", paisesOriginais: ["Egypt", "Sudan", "S. Sudan"] },
  { novoNome: "Sahel", paisesOriginais: ["Chad", "Niger", "Burkina Faso", "Mali"] },
  { novoNome: "Costa Ocidental", paisesOriginais: ["Sierra Leone", "Liberia", "Guinea", "Guinea-Bissau", "Senegal", "Gambia"] },
  { novoNome: "Costa do Ouro", paisesOriginais: ["Côte d'Ivoire", "Ghana"] },
  { novoNome: "Golfo da Guiné", paisesOriginais: ["Nigeria", "Benin", "Togo", "Sao Tome and Principe"] },
  { novoNome: "África Central Ocidental", paisesOriginais: ["Central African Republic", "Congo", "Gabon", "Equatorial Guinea", "Eq. Guinea", "Cameroon"] }, // ✅ Guiné Equatorial
  { novoNome: "Angola", paisesOriginais: ["Angola"] },
  { novoNome: "República Democratica do Congo", paisesOriginais: ["Dem. Rep. Congo"] },
  { novoNome: "Chifre da África", paisesOriginais: ["Somalia", "Djibouti", "Eritrea", "Ethiopia", "Somaliland"] },
  { novoNome: "Grandes Lagos", paisesOriginais: ["Rwanda", "Burundi", "Tanzania", "Uganda", "Kenya"] },
  { novoNome: "Moçambique-Malawi", paisesOriginais: ["Mozambique", "Malawi"] },
  { novoNome: "Rodésia", paisesOriginais: ["Zambia", "Zimbabwe"] },
  { novoNome: "África Austral", paisesOriginais: ["Namibia", "South Africa", "Lesotho", "Eswatini", "eSwatini", "Botswana"] },
  { novoNome: "Índico Insular", paisesOriginais: ["Madagascar", "Mauritius", "Comoros", "Seychelles"] },
  { novoNome: "Comunidade Australiana", paisesOriginais: ["Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "Palau", "Samoa", "Solomon Is.", "Tonga", "Tuvalu", "Vanuatu", "New Zealand", "New Caledonia"] } // ✅ Nova Caledônia e Ilhas Salomão
];

async function gerarMapaUnificado() {
  console.log("📂 Lendo mapa base...");
  const rawData = fs.readFileSync(path.join(__dirname, 'base.json'), 'utf-8');
  const geoJson = JSON.parse(rawData);
  const nomeProp = "NAME";

  const mapaCorPorPais: Record<string, string> = {};
  const mapaNomePorPais: Record<string, string> = {};

  for (const regra of REGRAS_FUSAO) {
    const cor = CORES_PARA_FUSAO[regra.novoNome] || '#4a4a4a';
    for (const paisOriginal of regra.paisesOriginais) {
      mapaCorPorPais[paisOriginal] = cor;
      mapaNomePorPais[paisOriginal] = regra.novoNome;
    }
  }

  const featuresMantidas = geoJson.features.map((f: any) => {
    const nomeOriginal = f.properties[nomeProp];
    let cor = mapaCorPorPais[nomeOriginal] || '#4a4a4a';
    const nomeFed = mapaNomePorPais[nomeOriginal] || nomeOriginal;
    
    // ✅ ANTÁRTICA BRANCA
    if (nomeOriginal === "Antarctica") {
        cor = '#ffffff';
    }

    return {
      ...f,
      properties: {
        ...f.properties,
        name: nomeFed,
        id: nomeFed.replace(/\s+/g, '_').toLowerCase(),
        cor: cor,
      }
    };
  });

  const novoGeoJson = { type: "FeatureCollection", features: featuresMantidas };
  fs.writeFileSync(path.join(__dirname, '../public/meu_mapa_final.json'), JSON.stringify(novoGeoJson, null, 2));
  console.log("✅ Mapa final gerado! (Antártica branca e nomes corrigidos)");
}

gerarMapaUnificado();