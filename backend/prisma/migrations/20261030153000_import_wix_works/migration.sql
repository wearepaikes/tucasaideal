-- Import the historical works still published in the original Wix gallery.
-- The photo slug makes this migration idempotent and avoids duplicating works
-- that were already created manually or by a previous seed.
INSERT INTO `Work` (`name`, `model`, `area`, `status`, `department`, `location`, `photo`, `photos`, `deliveredAt`, `active`, `createdAt`, `updatedAt`)
SELECT seed.name, seed.model, seed.area, 'ENTREGADA', seed.department, seed.location, seed.photo, JSON_ARRAY(seed.photo), NOW(3), true, NOW(3), NOW(3)
FROM (
  SELECT 'Casa 42 m² - Maldonado' name, '42' model, 42 area, 'Maldonado' department, 'Maldonado' location, '42m2-maldonado' photo UNION ALL
  SELECT 'Casa 52 m² - Punta del Diablo', '52', 52, 'Rocha', 'Punta del Diablo', '52m2-punta-del-diablo' UNION ALL
  SELECT 'Casa 30 m² - Solymar', '30', 30, 'Canelones', 'Solymar', '30m2-solymar' UNION ALL
  SELECT 'Casa 52 m² - Villa Serrana', '52', 52, 'Lavalleja', 'Villa Serrana', '52m2-villa-serrana' UNION ALL
  SELECT 'Casa 42 m² - Paysandú', '42', 42, 'Paysandú', 'Paysandú', '42m2-paysandu' UNION ALL
  SELECT 'Casa 30 m² - Carrasco Norte', '30', 30, 'Montevideo', 'Carrasco Norte', '30m2-carrasco-norte' UNION ALL
  SELECT 'Casa 42 m² - Santa Lucía', '42', 42, 'Canelones', 'Santa Lucía', '42m2-santa-lucia' UNION ALL
  SELECT 'Proyecto de 6 casas de 42 m² - Solymar', '42', 42, 'Canelones', 'Solymar', '42m2-solymar-proyecto-6' UNION ALL
  SELECT 'Proyecto de 3 casas de 42 m² - El Pinar', '42', 42, 'Canelones', 'El Pinar', '42m2-el-pinar-proyecto-3' UNION ALL
  SELECT 'Proyecto de casas de 42 y 30 m² - El Pinar', '42', 42, 'Canelones', 'El Pinar', '42m2-el-pinar-proyecto-mixto' UNION ALL
  SELECT 'Casa 52 m² - Balneario Argentino', '52', 52, 'Canelones', 'Balneario Argentino', '52m2-balneario-argentino' UNION ALL
  SELECT 'Casa 28 m² - Montevideo', '28', 28, 'Montevideo', 'Montevideo', '28m2-montevideo' UNION ALL
  SELECT 'Casa 30 m² - Canelón Chico', '30', 30, 'Canelones', 'Canelón Chico', '30m2-canelon-chico' UNION ALL
  SELECT 'Casa 52 m² - San Luis', '52', 52, 'Canelones', 'San Luis', '52m2-san-luis' UNION ALL
  SELECT 'Casa 42 m² - San Jacinto', '42', 42, 'Canelones', 'San Jacinto', '42m2-san-jacinto' UNION ALL
  SELECT 'Proyecto de 3 casas de 42 m² - Guazuvirá', '42', 42, 'Canelones', 'Guazuvirá', '42m2-guazuvira-proyecto-3' UNION ALL
  SELECT 'Casa 30 m² - Punta del Diablo', '30', 30, 'Rocha', 'Punta del Diablo', '30m2-punta-del-diablo' UNION ALL
  SELECT 'Casa 52 m² - Sauce de Portezuelo', '52', 52, 'Maldonado', 'Sauce de Portezuelo', '52m2-sauce-de-portezuelo-2' UNION ALL
  SELECT 'Casa 30 m² - El Pinar', '30', 30, 'Canelones', 'El Pinar', '30m2-el-pinar' UNION ALL
  SELECT 'Casa 42 m² - Atlántida', '42', 42, 'Canelones', 'Atlántida', '42m2-atlantida' UNION ALL
  SELECT 'Casa 30 m² - El Pinar', '30', 30, 'Canelones', 'El Pinar', '30m2-el-pinar-2' UNION ALL
  SELECT 'Casa 42 m² - Maldonado', '42', 42, 'Maldonado', 'Maldonado', '42m2-maldonado-2' UNION ALL
  SELECT 'Casa 42 m² - San Luis', '42', 42, 'Canelones', 'San Luis', '42m2-san-luis' UNION ALL
  SELECT 'Módulo 18 m² - Santa Ana', '18', 18, 'Colonia', 'Santa Ana', '18m2-santa-ana' UNION ALL
  SELECT 'Casa 52 m² - Shangrilá', '52', 52, 'Canelones', 'Shangrilá', '52m2-shangrila' UNION ALL
  SELECT 'Casa 30 m² - Pan de Azúcar', '30', 30, 'Maldonado', 'Pan de Azúcar', '30m2-pan-de-azucar' UNION ALL
  SELECT 'Casa 30 m² - Malvín', '30', 30, 'Montevideo', 'Malvín', '30m2-malvin' UNION ALL
  SELECT 'Casa 42 m² - Maroñas', '42', 42, 'Montevideo', 'Maroñas', '42m2-maronas' UNION ALL
  SELECT 'Casa 42 m² - Santa Ana', '42', 42, 'Colonia', 'Santa Ana', '42m2-santa-ana' UNION ALL
  SELECT 'Casa 30 m² - Pinar Sur', '30', 30, 'Canelones', 'Pinar Sur', '30m2-pinar-sur' UNION ALL
  SELECT 'Casa 30 m² - Maldonado', '30', 30, 'Maldonado', 'Maldonado', '30m2-maldonado-3' UNION ALL
  SELECT 'Casas de 30 m² - La Paz', '30', 30, 'Canelones', 'La Paz', '30m2-la-paz' UNION ALL
  SELECT 'Módulo 18 m² - Flor de Maroñas', '18', 18, 'Montevideo', 'Flor de Maroñas', '18m2-flor-de-maronas' UNION ALL
  SELECT 'Casa 42 m² - Lezica', '42', 42, 'Montevideo', 'Lezica', '42m2-lezica' UNION ALL
  SELECT 'Casa 42 m² - Los Cerrillos', '42', 42, 'Canelones', 'Los Cerrillos', '42m2-los-cerrillos' UNION ALL
  SELECT 'Casa 42 m² - Villa Española', '42', 42, 'Montevideo', 'Villa Española', '42m2-villa-espanola' UNION ALL
  SELECT 'Casa 30 m² - Solymar', '30', 30, 'Canelones', 'Solymar', '30m2-solymar-2' UNION ALL
  SELECT 'Módulo 18 m² - Carrasco Norte', '18', 18, 'Montevideo', 'Carrasco Norte', '18m2-carrasco-norte' UNION ALL
  SELECT 'Casa 30 m² - Bella Italia', '30', 30, 'Montevideo', 'Bella Italia', '30m2-bella-italia' UNION ALL
  SELECT 'Casa 42 m² - Balneario Argentino', '42', 42, 'Canelones', 'Balneario Argentino', '42m2-balneario-argentino' UNION ALL
  SELECT 'Casa 30 m² - Lomas de Solymar', '30', 30, 'Canelones', 'Lomas de Solymar', '30m2-lomas-de-solymar' UNION ALL
  SELECT 'Casa 42 m² - Estación Atlántida', '42', 42, 'Canelones', 'Estación Atlántida', '42m2-estacion-atlantida' UNION ALL
  SELECT 'Casa 30 m² - Piedras Blancas', '30', 30, 'Montevideo', 'Piedras Blancas', '30m2-piedras-blancas' UNION ALL
  SELECT 'Casa 42 m² - Melo', '42', 42, 'Cerro Largo', 'Melo', '42m2-melo' UNION ALL
  SELECT 'Casa 42 m² - Aeroparque', '42', 42, 'Canelones', 'Aeroparque', '42m2-aeroparque'
) seed
WHERE NOT EXISTS (SELECT 1 FROM `Work` existing WHERE existing.photo = seed.photo);
