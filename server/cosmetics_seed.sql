-- ===== COSMETIC ITEMS SEED DATA =====
-- Insertar cosméticos de ejemplo para Sala Starter
-- Tipos: avatar_frame, card_skin, chat_effect, badge
-- Rareza: common, rare, legendary

-- ===== AVATAR FRAMES (Marcos de Avatar) =====
INSERT INTO cosmetic_items (name, description, type, asset_url, rarity, color_hex, animation_class, is_free_available)
VALUES
  ('Marco Azul Neón', 'Borde azul neón luminoso con efecto glow', 'avatar_frame', 'frame-neon-blue', 'common', '#00BFFF', 'neon-glow', true),
  ('Marco Fuego Rojo', 'Borde rojo ardiente con llamas animadas', 'avatar_frame', 'frame-fire-red', 'common', '#FF4500', 'fire-animation', true),
  ('Marco Diamante', 'Borde de diamantes brillantes estilo lujo', 'avatar_frame', 'frame-diamond', 'rare', '#FFD700', 'diamond-sparkle', true),
  ('Marco Espacio Negro', 'Borde negro con efecto de constelaciones', 'avatar_frame', 'frame-space-black', 'rare', '#1A1A2E', 'starfield', true),
  ('Marco Legendario Oro', 'Borde dorado con efecto holográfico premium', 'avatar_frame', 'frame-legendary-gold', 'legendary', '#FFD700', 'holographic', false),
  ('Marco Púrpura Mágico', 'Borde púrpura con brillo místico', 'avatar_frame', 'frame-purple-magic', 'rare', '#9D4EDD', 'magic-glow', true);

-- ===== CARD SKINS (Skins para Cartones) =====
INSERT INTO cosmetic_items (name, description, type, asset_url, rarity, color_hex, animation_class, is_free_available)
VALUES
  ('Skin Ciberpunk Púrpura', 'Diseño futurista con colores neón purpura y rosa', 'card_skin', 'skin-cyberpunk-purple', 'common', '#A855F7', 'cyberpunk', true),
  ('Skin Print Animal', 'Patrón de leopardo con colores vibrantes', 'card_skin', 'skin-animal-print', 'common', '#D4A574', 'none', true),
  ('Skin Holográfico Oro', 'Efecto holográfico con tonos dorados y arcoíris', 'card_skin', 'skin-holographic-gold', 'rare', '#FFD700', 'holographic', true),
  ('Skin Mate Negro', 'Diseño elegante mate con ribetes plateados', 'card_skin', 'skin-matte-black', 'rare', '#2D2D2D', 'none', true),
  ('Skin Neón Cian', 'Líneas de neón cian sobre fondo oscuro', 'card_skin', 'skin-neon-cyan', 'common', '#00FFFF', 'neon-glow', true),
  ('Skin Legendario Cristal', 'Efecto de cristal roto con colores iridiscentes', 'card_skin', 'skin-legendary-crystal', 'legendary', '#E0E7FF', 'holographic', false),
  ('Skin Fuego Degradado', 'Degradado de fuego rojo a naranja', 'card_skin', 'skin-fire-gradient', 'rare', '#FF6B35', 'fire-animation', true),
  ('Skin Bioluminiscente', 'Verde neón con efecto de vida artificial', 'card_skin', 'skin-bioluminescent', 'rare', '#39FF14', 'neon-glow', true);

-- ===== CHAT EFFECTS (Efectos de Chat) =====
INSERT INTO cosmetic_items (name, description, type, asset_url, rarity, color_hex, animation_class, is_free_available)
VALUES
  ('Efecto Arcoíris', 'Texto con colores que cambian de arco iris', 'chat_effect', 'effect-rainbow', 'common', '#FF00FF', 'rainbow-shift', true),
  ('Efecto Código Binario', 'Lluvia de números binarios alrededor del texto', 'chat_effect', 'effect-binary', 'common', '#00FF00', 'binary-rain', true),
  ('Efecto Matrix', 'Cascada de caracteres verdes estilo Matrix', 'chat_effect', 'effect-matrix', 'rare', '#00AA00', 'matrix-rain', true),
  ('Efecto Estrellas', 'Estrellas flotantes alrededor de cada mensaje', 'chat_effect', 'effect-stars', 'common', '#FFD700', 'starfield', true),
  ('Efecto Fuego Premium', 'Llamas animadas de alta calidad alrededor del texto', 'chat_effect', 'effect-fire-premium', 'rare', '#FF4500', 'fire-animation', true),
  ('Efecto Legendario Auroras', 'Ondas de auroras boreales coloridas (LEGENDARIO)', 'chat_effect', 'effect-aurora', 'legendary', '#00FF7F', 'holographic', false),
  ('Efecto Nieve', 'Copos de nieve cayendo suavemente', 'chat_effect', 'effect-snow', 'common', '#E0FFFF', 'none', true),
  ('Efecto Electricidad', 'Rayos eléctricos pulsantes alrededor del texto', 'chat_effect', 'effect-electricity', 'rare', '#00BFFF', 'cyberpunk', true);

-- ===== BADGES (Insignias/Medallas) =====
INSERT INTO cosmetic_items (name, description, type, asset_url, rarity, color_hex, animation_class, is_free_available)
VALUES
  ('Insignia Ganador Free', 'Ganaste en Sala Starter - prueba de tu suerte', 'badge', 'badge-free-winner', 'common', '#10B981', 'none', true),
  ('Insignia Maestro NFT', 'Coleccionaste 5 o más cosméticos exclusivos', 'badge', 'badge-nft-master', 'rare', '#F59E0B', 'diamond-sparkle', false),
  ('Insignia Adoptante Temprano', 'Fuiste de los primeros en jugar Sala Starter', 'badge', 'badge-early-adopter', 'rare', '#8B5CF6', 'none', false),
  ('Insignia Coleccionista', 'Ganaste 10 premios diferentes en Sala Starter', 'badge', 'badge-collector', 'rare', '#EC4899', 'none', false),
  ('Insignia Leyenda Viviente', 'Logro supremo - conseguiste todos los cosméticos', 'badge', 'badge-living-legend', 'legendary', '#FFD700', 'holographic', false),
  ('Insignia Racha Ganadora', 'Ganaste 3 veces consecutivas', 'badge', 'badge-winning-streak', 'common', '#10B981', 'none', true),
  ('Insignia Jugador Activo', 'Participaste en 20+ sesiones', 'badge', 'badge-active-player', 'rare', '#3B82F6', 'none', false),
  ('Insignia Celebrador', 'Fuiste anunciado en el Muro de la Fama', 'badge', 'badge-celebrated', 'rare', '#FBBF24', 'none', false);

-- ===== VERIFICATION =====
-- Verificar inserciones
SELECT 
  type, 
  COUNT(*) as cantidad,
  SUM(CASE WHEN is_free_available THEN 1 ELSE 0 END) as disponibles_gratis
FROM cosmetic_items
GROUP BY type
ORDER BY type;

-- Contar total
SELECT COUNT(*) as total_cosmetics FROM cosmetic_items;
