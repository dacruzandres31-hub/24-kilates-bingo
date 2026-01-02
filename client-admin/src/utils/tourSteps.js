export const tourSteps = [
    {
        target: 'aside',
        title: '¡Bienvenido a tu Panel de Agente!',
        content: 'Este es el centro de control de <b>24 Kilates</b>. Desde aquí podrás gestionar toda tu operación: usuarios, finanzas, inventarios y monitoreo en tiempo real.<br><br>Vamos a dar un recorrido detallado para que domines todas las herramientas.',
        position: 'right'
    },
    {
        target: '#nav-group-estadisticas',
        title: '1. Dashboard y Estadísticas',
        content: 'Aquí tendrás una visión global de tu negocio. Podrás ver métricas clave como ingresos diarios, usuarios activos y rentabilidad en tiempo real.',
        position: 'right'
    },
    {
        target: '#nav-group-usuarios',
        title: '2. Gestión de Usuarios',
        content: 'El corazón de tu red. Aquí administras a todos tus jugadores y sub-agentes.',
        position: 'right'
    },
    {
        target: '#nav-usuarios', // Submenu item requires menu to be open? We might need to auto-open menus in the tour component logic, or just point to the group. Let's point to the group for overview.
        title: 'Red Administrativa',
        content: 'En <b>Gestión de Red</b> puedes crear nuevos usuarios, editar perfiles, bloquear cuentas y ver la jerarquía de tu organización.',
        position: 'right'
    },
    {
        target: '#nav-my-referrals',
        title: 'Mis Referidos',
        content: 'Gestiona los premios y bonificaciones para tus referidos directos. ¡Mantén a tu red motivada!',
        position: 'right'
    },
    {
        target: '#nav-group-finanzas',
        title: '3. Módulo Financiero',
        content: 'Control total sobre el flujo de dinero. Depósitos, retiros y contabilidad detallada.',
        position: 'right'
    },
    {
        target: '#nav-finanzas',
        title: 'Panel Financiero',
        content: 'La vista completa de tus finanzas. Balance actual, ganancias acumuladas y proyecciones.',
        position: 'right'
    },
    {
        target: '#nav-membership-accounting',
        title: 'Contabilidad de Membresías',
        content: '<b>¡Nuevo!</b> Rastrea todos los ingresos por suscripciones VIP ("Socio Embajador", Oro, etc.) y las comisiones distribuidas a la red.',
        position: 'right'
    },
    {
        target: '#nav-withdrawals',
        title: 'Gestión de Retiros',
        content: 'Administra las solicitudes de retiro de tus jugadores. Aprueba o rechaza pagos y sube comprobantes de transferencia.',
        position: 'right'
    },
    {
        target: '#nav-movimientos',
        title: 'Movimientos del Día',
        content: 'Auditoría en tiempo real. Cada ficha que se mueve queda registrada aquí para tu seguridad y control.',
        position: 'right'
    },
    {
        target: '#nav-group-card-inventory',
        title: '4. Inventario de Cartones',
        content: 'Supervisa el stock de cartones de bingo de tu red. Asegúrate de que nadie se quede sin jugar.',
        position: 'right'
    },
    {
        target: '#nav-inventories-panel',
        title: 'Inventarios de Red',
        content: 'Visualiza cuántos cartones tiene cada agente o jugador en tu estructura descendente.',
        position: 'right'
    },
    {
        target: '#nav-group-sesiones',
        title: '5. Salas y Sesiones',
        content: 'Monitorea la acción en vivo. Controla los estados de las salas de Bingo (Starter, Bronce, Plata, Oro).',
        position: 'right'
    },
    {
        target: '#nav-pozos',
        title: 'Estado de Pozos',
        content: 'Verifica los acumulados de los Jackpots y Pozos en tiempo real. ¡La emoción del juego está aquí!',
        position: 'right'
    },
    {
        target: '#nav-sesiones-live',
        title: 'Monitoreo en Vivo',
        content: 'Visualiza qué partidas se están jugando ahora mismo, cuántos jugadores hay conectados y el estado del sorteo.',
        position: 'right'
    },
    {
        target: '#nav-group-sistema',
        title: '6. Configuración del Sistema',
        content: 'Herramientas técnicas y de soporte para mantener la plataforma funcionando sin problemas.',
        position: 'right'
    },
    {
        target: '#nav-whatsapp-config',
        title: 'Conexión WhatsApp',
        content: 'Vincula tu instancia de WhatsApp para enviar notificaciones automáticas y alertas a tus usuarios.',
        position: 'right'
    },
    {
        target: '#nav-audit-logs',
        title: 'Logs de Auditoría',
        content: 'El registro forense de la plataforma. Rastrea cambios críticos, accesos y acciones administrativas.',
        position: 'right'
    },
    {
        target: '#nav-support',
        title: 'Soporte Técnico',
        content: 'Si encuentras algún problema técnico o necesitas asistencia avanzada, abre un ticket aquí.',
        position: 'right'
    },
    {
        target: 'aside',
        title: '¡Estás listo!',
        content: 'Has completado el recorrido. Ahora tienes el conocimiento para gestionar tu negocio de Bingo con éxito.<br><br><b>¡Buena suerte y grandes ganancias!</b> 🚀',
        position: 'right'
    }
];
