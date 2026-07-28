
-- ============================================================
--  LABRADOR — Schema Final Atualizado (COM SEED DE 82 PAÍSES)
--  Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. COUNTRIES (INT primary key, com coluna slug)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.countries (
  id              INT PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  capital         TEXT NOT NULL DEFAULT 'Capital',
  motto           TEXT,
  leader_name     TEXT NOT NULL,
  leader_photo    TEXT,
  flag_url        TEXT,
  banner_urls     TEXT[] DEFAULT '{}',
  currency        TEXT DEFAULT 'NF ($)',
  religion        TEXT DEFAULT 'Sem religião oficial',
  state_structure TEXT DEFAULT 'Democracia',
  leader_title    TEXT DEFAULT 'Presidente',
  language        TEXT DEFAULT 'Português',
  trust           INTEGER DEFAULT 50 CHECK (trust >= 0 AND trust <= 100),
  money           BIGINT DEFAULT 100000,
  pollution       INTEGER DEFAULT 0 CHECK (pollution >= 0 AND pollution <= 100),
  is_npc          BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. REGIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id      INT         NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  area_km2        INT         NOT NULL DEFAULT 300000,
  used_area       INT         NOT NULL DEFAULT 0,
  total_buildings INT         NOT NULL DEFAULT 0,
  terrain         TEXT        NOT NULL DEFAULT 'planicie'
                  CHECK (terrain IN ('orogenico','planicie','extremista','anfibio')),
  is_coastal      BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. BUILDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buildings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id    INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  region_id     UUID REFERENCES public.regions(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  quantity      INTEGER DEFAULT 1 CHECK (quantity > 0),
  quality_stars NUMERIC(2,1) DEFAULT 0 CHECK (quality_stars >= 0 AND quality_stars <= 5),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id INT UNIQUE NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  food       BIGINT DEFAULT 0,
  gold       BIGINT DEFAULT 0,
  iron       BIGINT DEFAULT 0,
  oil        BIGINT DEFAULT 0,
  wood       BIGINT DEFAULT 0,
  uranium    BIGINT DEFAULT 0,
  coal       BIGINT DEFAULT 0,
  steel      BIGINT DEFAULT 0,
  energy     BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. MILITARY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.military (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id  INT UNIQUE NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  soldiers    INTEGER DEFAULT 0,
  ammunition  INTEGER DEFAULT 0,
  tanks       INTEGER DEFAULT 0,
  artillery   INTEGER DEFAULT 0,
  aircraft    INTEGER DEFAULT 0,
  helicopters INTEGER DEFAULT 0,
  drones      INTEGER DEFAULT 0,
  ships       INTEGER DEFAULT 0,
  submarines  INTEGER DEFAULT 0,
  missiles    INTEGER DEFAULT 0,
  warheads    INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PARLIAMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parliament (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id       INT UNIQUE NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  coalition_seats  INTEGER DEFAULT 250,
  opposition_seats INTEGER DEFAULT 250,
  total_seats      INTEGER DEFAULT 500,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TAXES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.taxes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id    INT UNIQUE NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  income        NUMERIC(5,2) DEFAULT 15,
  property      NUMERIC(5,2) DEFAULT 5,
  vat           NUMERIC(5,2) DEFAULT 10,
  customs       NUMERIC(5,2) DEFAULT 8,
  manufacturing NUMERIC(5,2) DEFAULT 12,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. LAWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.laws (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id    INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  votes_for     INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('active','revoked','pending')),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. WARS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wars (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id INT REFERENCES public.countries(id),
  defender_id INT REFERENCES public.countries(id),
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','peace','ended')),
  terrain     TEXT DEFAULT 'planicie',
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

-- ============================================================
-- 10. MILITARY TRAINING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.military_training (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  unit_type  TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at    TIMESTAMPTZ NOT NULL,
  completed  BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 11. ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT NOT NULL,
  image_url  TEXT,
  likes      INTEGER DEFAULT 0,
  dislikes   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.article_votes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote       SMALLINT CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, user_id)
);

-- ============================================================
-- 12. COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  country_id INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  likes      INTEGER DEFAULT 0,
  dislikes   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  media_url  TEXT,
  media_type TEXT CHECK (media_type IN ('image','gif','sticker','video','audio')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. DIPLOMACY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diplomacy (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_a_id        INT NOT NULL REFERENCES public.countries(id),
  country_b_id        INT NOT NULL REFERENCES public.countries(id),
  status              TEXT DEFAULT 'neutral' CHECK (status IN ('ally','neutral','war')),
  relation_score      INT NOT NULL DEFAULT 50 CHECK (relation_score BETWEEN 0 AND 100),
  has_embassy         BOOLEAN DEFAULT FALSE,
  is_sanctioned       BOOLEAN DEFAULT FALSE,
  treaty_status       TEXT,
  treaty_message      TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (country_a_id, country_b_id),
  CHECK (country_a_id < country_b_id)
);

-- ============================================================
-- 15. MARKET
-- ============================================================
CREATE TABLE IF NOT EXISTS public.market (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id     INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  resource_type  TEXT NOT NULL,
  order_type     TEXT NOT NULL CHECK (order_type IN ('sell','buy')),
  quantity       INT NOT NULL CHECK (quantity > 0),
  available_qty  INT NOT NULL,
  price_per_unit NUMERIC NOT NULL CHECK (price_per_unit > 0),
  total_value    NUMERIC NOT NULL,
  status         TEXT DEFAULT 'open' CHECK (status IN ('open','partial','closed','expired')),
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id INT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. COUNTRY MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_country INT NOT NULL REFERENCES public.countries(id),
  to_country   INT NOT NULL REFERENCES public.countries(id),
  content      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. DIPLOMATIC MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diplomatic_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL CHECK (type IN ('formal_positive', 'formal_negative', 'insult', 'threat')),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  effect_relation INTEGER NOT NULL DEFAULT 0,
  effect_approval INTEGER NOT NULL DEFAULT 0,
  effect_trust    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. INSERIR AS MENSAGENS DIPLOMÁTICAS PRÉ-DEFINIDAS
-- ============================================================
INSERT INTO public.diplomatic_messages (type, title, content, effect_relation, effect_approval, effect_trust) VALUES
('formal_positive', '🌟 Mensagem de Amizade', 
 'O governo do seu país envia suas mais sinceras saudações e deseja estabelecer laços de cooperação e prosperidade mútua.',
 15, 5, 5),
('formal_negative', '📜 Nota de Repúdio', 
 'O governo do seu país expressa sua profunda preocupação com as recentes ações do seu governo, que consideramos uma ameaça à estabilidade regional.',
 -20, -5, -10),
('insult', '🤬 Insulto Grave', 
 'Vocês são um bando de incompetentes e a sua liderança é um lixo! Não passam de um país de terceira categoria!',
 -50, -20, -30),
('threat', '⚡ Ameaça de Guerra', 
 'Seu país está brincando com fogo. Se continuar com essa atitude, não hesitaremos em usar todos os meios necessários para proteger nossos interesses.',
 -40, -15, -20);

-- ============================================================
-- 20. FUNÇÃO RPC PARA ENVIAR MENSAGEM DIPLOMÁTICA
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_diplomatic_message(
  p_from_country INT,
  p_to_country INT,
  p_message_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_message RECORD;
BEGIN
  -- Busca a mensagem escolhida
  SELECT * INTO v_message FROM public.diplomatic_messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Mensagem não encontrada');
  END IF;

  -- Insere a mensagem na tabela de mensagens do país
  INSERT INTO public.country_messages (from_country, to_country, content)
  VALUES (p_from_country, p_to_country, v_message.content);

  -- Atualiza a relação diplomática
  INSERT INTO public.diplomacy (country_a_id, country_b_id, relation_score)
  VALUES (LEAST(p_from_country, p_to_country), GREATEST(p_from_country, p_to_country), GREATEST(0, LEAST(100, 50 + v_message.effect_relation)))
  ON CONFLICT (country_a_id, country_b_id) DO UPDATE
  SET relation_score = GREATEST(0, LEAST(100, diplomacy.relation_score + v_message.effect_relation));

  -- Atualiza a aprovação internacional do país que ENVIOU
  UPDATE public.countries SET
    intl_approval = GREATEST(0, LEAST(100, intl_approval + v_message.effect_approval))
  WHERE id = p_from_country;

  -- Atualiza a confiança do país que ENVIOU
  UPDATE public.countries SET
    trust = GREATEST(0, LEAST(100, trust + v_message.effect_trust))
  WHERE id = p_from_country;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Mensagem enviada com sucesso!');
END;
$$;

-- ============================================================
-- 21. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.military ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.military_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diplomatic_messages ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de leitura pública
CREATE POLICY "Public read" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.military FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.parliament FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.taxes FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.laws FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.wars FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.military_training FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.article_votes FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.diplomacy FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.market FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.country_messages FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.diplomatic_messages FOR SELECT USING (true);

-- ============================================================
-- 22. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diplomacy;
ALTER PUBLICATION supabase_realtime ADD TABLE public.country_messages;

-- ============================================================
-- 23. SEED DATA — 82 PAÍSES
-- ============================================================
INSERT INTO public.countries (id, name, slug, flag_emoji, capital, terrain) VALUES
(1,  'Africa Austral',              'africa-austral',              '🇳🇦', 'Joanesburgo',        'planicie'),
(2,  'Africa Central Ocidental',    'africa-central-ocidental',    '🇨🇫', 'Yaounde',            'anfibio'),
(3,  'Alemanha',                    'alemanha',                    '🇩🇪', 'Berlim',             'planicie'),
(4,  'America Central',             'america-central',             '🇬🇹', 'Cidade da Guatemala','orogenico'),
(5,  'Andino',                      'andino',                      '🇧🇴', 'Lima',               'orogenico'),
(6,  'Angola',                      'angola',                      '🇦🇴', 'Luanda',             'planicie'),
(7,  'Argelia',                     'argelia',                     '🇩🇿', 'Argel',              'extremista'),
(8,  'Asia Turcomena',              'asia-turcomena',              '🇰🇿', 'Nur-Sultan',         'extremista'),
(9,  'Austria',                     'austria',                     '🇦🇹', 'Viena',              'orogenico'),
(10, 'Balcas Ocidentais',           'balcas-ocidentais',           '🇸🇮', 'Zagreb',             'orogenico'),
(11, 'Balticos',                    'balticos',                    '🇪🇪', 'Riga',               'planicie'),
(12, 'Benelux',                     'benelux',                     '🇳🇱', 'Bruxelas',           'planicie'),
(13, 'Bielorrussia',                'bielorrussia',                '🇧🇾', 'Minsk',              'planicie'),
(14, 'Brasil',                      'brasil',                      '🇧🇷', 'Brasília',           'anfibio'),
(15, 'Bulgaria',                    'bulgaria',                    '🇧🇬', 'Sofia',              'orogenico'),
(16, 'Canada',                      'canada',                      '🇨🇦', 'Toronto',            'orogenico'),
(17, 'Caribe',                      'caribe',                      '🇨🇺', 'Havana',             'anfibio'),
(18, 'Caucaso',                     'caucaso',                     '🇬🇪', 'Tbilisi',            'orogenico'),
(19, 'Chifre da Africa',            'chifre-da-africa',            '🇸🇴', 'Mogadiscio',         'extremista'),
(20, 'Chile',                       'chile',                       '🇨🇱', 'Santiago',           'orogenico'),
(21, 'China',                       'china',                       '🇨🇳', 'Pequim',             'orogenico'),
(22, 'Colômbia',                    'colombia',                    '🇨🇴', 'Bogota',             'orogenico'),
(23, 'Comunidade Australiana',      'comunidade-australiana',      '🇦🇺', 'Camberra',           'extremista'),
(24, 'Coreia',                      'coreia',                      '🇰🇵', 'Seul',               'orogenico'),
(25, 'Costa do Ouro',               'costa-do-ouro',               '🇨🇮', 'Abidjan',            'anfibio'),
(26, 'Costa Ocidental',             'costa-ocidental',             '🇸🇱', 'Dacar',              'anfibio'),
(27, 'Eritreia',                    'eritreia',                    '🇪🇷', 'Asmara',             'extremista'),
(28, 'Uniao Iberica',               'uniao-iberica',               '🇪🇸', 'Madrid',             'orogenico'),
(29, 'Estados Unidos',              'estados-unidos',              '🇺🇸', 'Washington D.C.',    'planicie'),
(30, 'Filipinas',                   'filipinas',                   '🇵🇭', 'Manila',             'anfibio'),
(31, 'França',                      'franca',                      '🇫🇷', 'Paris',              'planicie'),
(32, 'Golfo da Guine',              'golfo-da-guine',              '🇳🇬', 'Abuja',              'anfibio'),
(33, 'Grande Lagos',                'grande-lagos',                '🇷🇼', 'Nairobi',            'anfibio'),
(34, 'Grande Paquistao',            'grande-paquistao',            '🇵🇰', 'Islamabad',          'extremista'),
(35, 'Grecia',                      'grecia',                      '🇬🇷', 'Atenas',             'orogenico'),
(36, 'Guianas',                     'guianas',                     '🇬🇾', 'Georgetown',         'anfibio'),
(37, 'Himalaia',                    'himalaia',                    '🇳🇵', 'Katmandu',           'orogenico'),
(38, 'Hungria',                     'hungria',                     '🇭🇺', 'Budapeste',          'planicie'),
(39, 'Iliria',                      'iliria',                      '🇦🇱', 'Tirana',             'orogenico'),
(40, 'Imperio Dinarmaques',         'imperio-dinarmaques',         '🇩🇰', 'Copenhague',         'planicie'),
(41, 'Taiwan',                      'taiwan',                      '�🇼', 'Taipei',             'orogenico'),
(42, 'India',                       'india',                       '🇮🇳', 'Nova Delhi',         'planicie'),
(43, 'Indico Insular',              'indico-insular',              '🇲🇬', 'Antananarivo',       'anfibio'),
(44, 'Indochina',                   'indochina',                   '🇻🇳', 'Hanoi',              'anfibio'),
(45, 'Indias Orientais',            'indias-orientais',            '🇮🇩', 'Jacarta',            'anfibio'),
(46, 'Ira',                         'ira',                         '🇮🇷', 'Teera',              'extremista'),
(47, 'Iraque',                      'iraque',                      '🇮🇶', 'Bagda',              'extremista'),
(48, 'Irlanda',                     'irlanda',                     '🇮🇪', 'Dublin',             'planicie'),
(49, 'Israel',                      'israel',                      '🇮🇱', 'Jerusalem',          'extremista'),
(50, 'Italia',                      'italia',                      '🇮🇹', 'Roma',               'orogenico'),
(51, 'Japao',                       'japao',                       '🇯🇵', 'Toquio',             'orogenico'),
(52, 'Levante',                     'levante',                     '🇸🇾', 'Damasco',            'extremista'),
(53, 'Magrebe Oriental',            'magrebe-oriental',            '🇱🇾', 'Tripoli',            'extremista'),
(54, 'Marrocos',                    'marrocos',                    '🇲🇦', 'Rabat',              'orogenico'),
(55, 'Mauritânia',                  'mauritania',                  '🇲🇷', 'Nouakchott',         'extremista'),
(56, 'Mercosul',                    'mercosul',                    '🇦🇷', 'Buenos Aires',       'planicie'),
(57, 'Mexico',                      'mexico',                      '🇲🇽', 'Cidade do México',   'orogenico'),
(58, 'Moçambique',                  'mocambique',                  '🇲🇿', 'Maputo',             'anfibio'),
(59, 'Mongolia',                    'mongolia',                    '🇲🇳', 'Ulaanbaatar',        'extremista'),
(60, 'Myanmar',                     'myanmar',                     '🇲🇲', 'Naypyidaw',          'orogenico'),
(61, 'Peninsula Arabica',           'peninsula-arabica',           '🇸🇦', 'Riade',              'extremista'),
(62, 'Polonia',                     'polonia',                     '🇵🇱', 'Varsovia',           'planicie'),
(63, 'Portugal',                    'portugal',                    '🇵🇹', 'Lisboa',             'planicie'),
(64, 'Republica Democrática do Congo', 'rd-congo',                    '🇨🇩', 'Kinshasa',           'anfibio'),
(65, 'Reino Unido',                 'reino-unido',                 '🇬🇧', 'Londres',            'planicie'),
(66, 'Rodesia',                     'rodesia',                     '🇿🇲', 'Lusaka',             'planicie'),
(67, 'Romenia',                     'romenia',                     '🇷🇴', 'Bucareste',          'planicie'),
(68, 'Russia',                      'russia',                      '🇷🇺', 'Moscou',             'extremista'),
(69, 'Sahel',                       'sahel',                       '🇹🇩', 'N Djamena',          'extremista'),
(70, 'Servia',                      'servia',                      '🇷🇸', 'Belgrado',           'planicie'),
(71, 'Comunidade Nordica',          'comunidade-nordica',          '🇸🇪', 'Estocolmo',          'anfibio'),
(72, 'Suica',                       'suica',                       '🇨🇭', 'Berna',              'orogenico'),
(73, 'Tailandia',                   'tailandia',                   '🇹🇭', 'Bangkok',            'anfibio'),
(74, 'Tchecoslovaquia',             'tchecoslovaquia',             '🇨🇿', 'Praga',              'orogenico'),
(75, 'Turquia',                     'turquia',                     '🇹🇷', 'Ancara',             'orogenico'),
(76, 'Ucrania',                     'ucrania',                     '🇺🇦', 'Kiev',               'planicie'),
(77, 'Vale do Nilo',                'vale-do-nilo',                '🇪🇬', 'Cairo',              'extremista'),
(78, 'Venezuela',                   'venezuela',                   '🇻🇪', 'Caracas',            'anfibio');

-- ============================================================
-- 24. CRIAÇÃO DO TRIGGER PARA NOVOS USUÁRIOS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_country_id INT;
BEGIN
  v_country_id := (NEW.raw_user_meta_data->>'country_id')::INT;
  IF v_country_id IS NULL THEN
    RAISE EXCEPTION 'country_id is required in user metadata';
  END IF;
  UPDATE public.countries SET is_active = TRUE WHERE id = v_country_id;
  INSERT INTO public.users (user_id, country_id, email) VALUES (NEW.id, v_country_id, NEW.email);
  INSERT INTO public.regions (country_id, name, area_km2, terrain)
    SELECT v_country_id, c.capital || ' Region', 300000, c.terrain
    FROM public.countries c WHERE c.id = v_country_id;
  INSERT INTO public.economy    (country_id) VALUES (v_country_id);
  INSERT INTO public.military   (country_id) VALUES (v_country_id);
  INSERT INTO public.parliament (country_id) VALUES (v_country_id);
  INSERT INTO public.taxes      (country_id) VALUES (v_country_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 25. TABELA DE USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id   INT         REFERENCES public.countries(id),
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  flag_url     TEXT,
  leader_url   TEXT,
  banner_urls  TEXT[]      DEFAULT '{}',
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);