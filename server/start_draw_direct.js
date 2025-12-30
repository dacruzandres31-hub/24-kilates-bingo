const gameAdminController = require('./src/controllers/gameAdminController');
const websocketService = require('./src/services/websocketService');

// Simular inicialización de IO si no está
if (!global.io) {
    global.io = { emit: (ev, data) => console.log(`[IO GLOBAL] ${ev}`, data) };
}

async function run() {
    // El motor debería estar inicializado en el servidor real,
    // pero aquí estamos en un script separado.
    // Sin embargo, queremos que el SERVIDOR real sea el que haga el sorteo si es posible.
    // Pero como no tenemos el token, usaremos el script para "gatillar" el motor del servidor.

    // O mejor, simplemente usamos el motor aquí mismo para ver si emite los eventos.
    // Pero el usuario quiere ver que "todos vean el sorteo en vivo" en el sistema real.

    // Si el servidor ya está corriendo, puedo intentar bypassar auth o usar un token de admin.
    console.log('Iniciando sorteo forzado...');

    // Requerir el index.js del servidor podría ser demasiado pesado.
    // Usaremos un script que se conecte al socket y vea si hay actividad.
}
run();
