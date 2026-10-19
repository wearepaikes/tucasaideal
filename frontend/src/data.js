export const projects = {
  solymar1: { name: 'Complejo Solymar I', status: '100% vendido', cover: 'solymar1_01', photos: ['solymar1_01', 'solymar1_00', 'solymar1_02', 'solymar1_03', 'solymar1_04', 'solymar1_09'] },
  gardens: { name: 'Solymar Gardens', status: '75% vendido', cover: 'gardens_05', photos: ['gardens_05', 'gardens_00', 'gardens_03', 'gardens_04', 'gardens_06', 'gardens_07', 'gardens_13', 'gardens_17', 'gardens_14'] },
  pinar: { name: 'Pinar Gardens', status: 'En desarrollo', cover: 'pinar_00', photos: ['pinar_00', 'pinar_01', 'pinar_02', 'pinar_03'] },
  lagomar: { name: 'Complejo Lagomar I', status: '100% vendido', cover: 'lagomar_01', photos: ['lagomar_01', 'lagomar_00', 'lagomar_02', 'lagomar_03'] },
};

export const works = [
  ['30','Solís de Mataojo','30m2-solis-de-mataojo'],['52','Montevideo','52m2-montevideo'],['52','Piriápolis','52m2-piriapolis'],['42','Solís de Mataojo','42m2-solis-de-mataojo'],['42','Ciudad del Plata','42m2-ciudad-del-plata'],['42','Solís de Mataojo','42m2-solis-de-mataojo-2'],['18','Salinas','18m2-salinas'],['52','Rocha','52m2-rocha'],['30','Maldonado','30m2-maldonado'],['42','Guazuvirá Nuevo','42m2-guazuvira-nuevo'],['52','Parque del Plata','52m2-parque-del-plata'],['30','Neptunia','30m2-neptunia'],['52','Sauce de Portezuelo','52m2-sauce-de-portezuelo'],['30','Pando','30m2-pando'],['30','Maldonado','30m2-maldonado-2'],['30','Las Piedras','30m2-las-piedras'],['30','Las Piedras','30m2-las-piedras-2'],['42','Av. Instrucciones, Montevideo','42m2-av-instrucciones-montevideo'],['42','Marindia','42m2-marindia'],['30','Villa Argentina','30m2-villa-argentina'],['30','Pando','30m2-pando-2'],['42','Santa Lucía del Este','42m2-santa-lucia-del-este','r90OHjkdKz0'],['52','Treinta y Tres','52m2-treinta-y-tres','yVM38NKud1c'],['52','La Paloma','52m2-la-paloma']
].map(([model, location, photo, youtube]) => ({ model, location, photo, youtube }));
