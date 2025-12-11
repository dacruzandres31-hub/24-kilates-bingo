import { useState, useEffect } from 'react';
import axios from 'axios';

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [arbolJerarquico, setArbolJerarquico] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: '',
    password: '',
    role: 'jugador',
    parent_id: null
  });
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [cartones, setCartones] = useState({
    bronce: 0,
    plata: 0,
    oro: 0
  });
  
  // Estados para el modal de dinero
  const [modalDinero, setModalDinero] = useState({
    isOpen: false,
    tipo: null, // 'cargar' o 'descargar'
    userId: null,
    username: '',
    saldoActual: 0,
    monto: '',
    buttonPosition: null
  });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Estados para el modal de creación de usuario
  const [modalCrearUsuario, setModalCrearUsuario] = useState({
    isOpen: false,
    tipoUsuario: 'jugador', // 'jugador' o 'agente'
    tabActiva: 'ingreso', // 'ingreso' o 'datos_personales'
    datosIngreso: {
      username: '',
      password: ''
    },
    datosPersonales: {
      nombre_completo: '',
      documento: '',
      email: '',
      telefono: ''
    }
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users/hierarchy', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArbolJerarquico(response.data.tree || []);
      setUsuarios(response.data.all || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const abrirModalCrearUsuario = (tipo) => {
    setModalCrearUsuario({
      isOpen: true,
      tipoUsuario: tipo,
      tabActiva: 'ingreso',
      datosIngreso: {
        username: '',
        password: ''
      },
      datosPersonales: {
        nombre_completo: '',
        documento: '',
        email: '',
        telefono: ''
      }
    });
  };

  const handleCrearUsuario = async () => {
    const { datosIngreso, datosPersonales, tipoUsuario } = modalCrearUsuario;

    // Validar campos obligatorios
    if (!datosIngreso.username || !datosIngreso.password) {
      alert('❌ Usuario y contraseña son obligatorios');
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      
      const userData = {
        username: datosIngreso.username,
        password: datosIngreso.password,
        role: tipoUsuario,
        parent_id: null,
        // Datos personales opcionales
        ...(datosPersonales.nombre_completo && { nombre_completo: datosPersonales.nombre_completo }),
        ...(datosPersonales.documento && { documento: datosPersonales.documento }),
        ...(datosPersonales.email && { email: datosPersonales.email }),
        ...(datosPersonales.telefono && { telefono: datosPersonales.telefono })
      };

      await axios.post('/api/admin/users/create', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`✅ ${tipoUsuario.toUpperCase()} "${datosIngreso.username}" creado exitosamente`);
      
      // Cerrar modal y recargar
      setModalCrearUsuario({ ...modalCrearUsuario, isOpen: false });
      cargarUsuarios();
    } catch (error) {
      alert('❌ Error creando usuario: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCargarCartones = async (userId, sala, cantidad) => {
    // Validar antes de descargar
    if (cantidad < 0) {
      const usuario = usuarios.find(u => u.id === userId);
      if (!usuario) return;

      const cartonesActuales = usuario[`cards_${sala}`] || 0;
      
      if (cartonesActuales <= 0) {
        alert(`❌ El usuario no tiene cartones de ${sala.toUpperCase()} para descargar`);
        return;
      }

      if (cartonesActuales < Math.abs(cantidad)) {
        alert(`❌ El usuario solo tiene ${cartonesActuales} cartón(es) de ${sala.toUpperCase()}, no se pueden descargar ${Math.abs(cantidad)}`);
        return;
      }
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/users/add-cards', {
        userId: userId,
        room: sala,
        quantity: cantidad
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      cargarUsuarios();
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCargarDinero = async (userId, event) => {
    const usuario = usuarios.find(u => u.id === userId);
    if (!usuario) return;

    const buttonRect = event.currentTarget.getBoundingClientRect();
    
    setModalDinero({
      isOpen: true,
      tipo: 'cargar',
      userId: userId,
      username: usuario.username,
      saldoActual: usuario.balance || 0,
      monto: '',
      buttonPosition: {
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX
      }
    });
  };

  const handleDescargarDinero = async (userId, event) => {
    const usuario = usuarios.find(u => u.id === userId);
    if (!usuario) return;

    const balanceActual = usuario.balance || 0;

    if (balanceActual <= 0) {
      alert(`❌ El usuario ${usuario.username} no tiene saldo disponible para descargar`);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();

    setModalDinero({
      isOpen: true,
      tipo: 'descargar',
      userId: userId,
      username: usuario.username,
      saldoActual: balanceActual,
      monto: '',
      buttonPosition: {
        top: buttonRect.bottom + window.scrollY,
        left: buttonRect.left + window.scrollX
      }
    });
  };

  const procesarMovimientoDinero = async (e) => {
    if (e) e.preventDefault();

    const { userId, tipo, monto, saldoActual } = modalDinero;
    const montoNumerico = parseFloat(monto);

    if (!monto || isNaN(montoNumerico) || montoNumerico <= 0) {
      alert('❌ Debes ingresar un monto válido mayor a 0');
      return;
    }

    // Validar descarga
    if (tipo === 'descargar' && montoNumerico > saldoActual) {
      alert(`❌ El saldo actual es $${saldoActual.toLocaleString('es-CO')}, no se pueden descargar $${montoNumerico.toLocaleString('es-CO')}`);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/users/add-balance', {
        userId: userId,
        amount: tipo === 'cargar' ? montoNumerico : -montoNumerico
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cerrar modal
      setModalDinero({ isOpen: false, tipo: null, userId: null, username: '', saldoActual: 0, monto: '', buttonPosition: null });
      
      // Mostrar popup de éxito
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2000);

      // Recargar usuarios
      cargarUsuarios();
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || error.message));
    }
  };

  // Ordenar usuarios alfabéticamente: primero agentes, luego jugadores
  const usuariosOrdenados = [...usuarios].sort((a, b) => {
    // Primero por role (agentes primero)
    if (a.role === 'agente' && b.role !== 'agente') return -1;
    if (a.role !== 'agente' && b.role === 'agente') return 1;
    // Luego alfabéticamente
    return a.username.localeCompare(b.username);
  });

  const renderNodoArbol = (nodo, nivel = 0) => {
    const marginLeft = nivel * 30;
    const iconoRole = {
      'superadmin': '👑',
      'agente': '🏢',
      'cajero': '💰',
      'jugador': '👤'
    };

    return (
      <div key={nodo.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
            usuarioSeleccionado?.id === nodo.id
              ? 'bg-blue-500 text-white'
              : 'hover:bg-gray-100'
          }`}
          style={{ marginLeft: `${marginLeft}px` }}
          onClick={() => {
            setUsuarioSeleccionado(nodo);
            setCartones({
              bronce: nodo.cards_bronce || 0,
              plata: nodo.cards_plata || 0,
              oro: nodo.cards_oro || 0
            });
          }}
        >
          <span className="text-xl">{iconoRole[nodo.role]}</span>
          <span className="font-medium">{nodo.username}</span>
          <span className="text-xs text-gray-500">({nodo.role})</span>
          {nodo.children && nodo.children.length > 0 && (
            <span className="text-xs text-gray-400 ml-2">
              [{nodo.children.length}]
            </span>
          )}
        </div>
        {nodo.children && nodo.children.map(child => renderNodoArbol(child, nivel + 1))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel Izquierdo: Carga Rápida */}
      <div className="lg:col-span-2 space-y-6">
        {/* Carga Rápida */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="bg-blue-500 text-white text-center py-3 rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 className="text-xl font-bold">Carga rápida</h3>
          </div>

          <div className="space-y-4">
            {/* Botones de creación */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => abrirModalCrearUsuario('jugador')}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>👤</span>
                <span>NUEVO JUGADOR</span>
              </button>

              <button
                onClick={() => abrirModalCrearUsuario('agente')}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>🏢</span>
                <span>NUEVO AGENTE</span>
              </button>
            </div>

            {/* Carga rápida de saldo/cartones */}
            <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                value={nuevoUsuario.username}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, username: e.target.value })}
                placeholder="Nombre de usuario"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />

              {/* Botón + (Cargar) */}
              <button
                disabled={!nuevoUsuario.username}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Abrir modal de carga
                  console.log('Cargar a:', nuevoUsuario.username);
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl disabled:cursor-not-allowed"
                title="Cargar cartones o dinero"
              >
                <span className="text-2xl font-extrabold leading-none">+</span>
              </button>

              {/* Botón - (Descargar) */}
              <button
                disabled={!nuevoUsuario.username}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Abrir modal de descarga
                  console.log('Descargar a:', nuevoUsuario.username);
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl disabled:cursor-not-allowed"
                title="Descargar cartones o dinero"
              >
                <span className="text-2xl font-extrabold leading-none">−</span>
              </button>
            </div>
          </div>
        </div>

        {/* Listado de Usuarios Alfabético */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="bg-green-500 text-white text-center py-3 rounded-t-lg -mx-6 -mt-6 mb-6">
            <h3 className="text-xl font-bold">Listado de Usuarios</h3>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {usuariosOrdenados.length > 0 ? (
              usuariosOrdenados.map((usuario) => (
                <div
                  key={usuario.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    usuario.role === 'agente' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200'
                  } hover:shadow-md transition-shadow`}
                >
                  {/* Nombre y Balance */}
                  <div className="flex-none min-w-[150px]">
                    <h4
                      className={`text-base font-bold ${
                        usuario.role === 'agente' ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {usuario.username}
                    </h4>
                    <span className="text-xs text-gray-500">
                      ${(usuario.balance || 0).toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Botones + y - al centro */}
                  <div className="flex-1 flex justify-center items-center gap-3">
                    {/* Botón + (Cargar) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de carga (cartones/dinero)
                        console.log('Cargar:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl"
                      title="Cargar cartones o dinero"
                    >
                      <span className="text-2xl font-extrabold leading-none">+</span>
                    </button>

                    {/* Botón - (Descargar) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de descarga (cartones/dinero)
                        console.log('Descargar:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl"
                      title="Descargar cartones o dinero"
                    >
                      <span className="text-2xl font-extrabold leading-none">−</span>
                    </button>
                  </div>

                  {/* Botones de Acciones a la derecha */}
                  <div className="flex items-center gap-1">
                    {/* Botón i (Información) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de información
                        console.log('Info:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-md"
                      title="Ver información del usuario"
                    >
                      <span className="text-sm font-bold">ⓘ</span>
                    </button>

                    {/* Botón 🔑 (Cambiar Contraseña) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de cambio de contraseña
                        console.log('Cambiar contraseña:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-md"
                      title="Cambiar contraseña"
                    >
                      <span className="text-base">🔑</span>
                    </button>

                    {/* Botón ✏️ (Editar Usuario) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de edición
                        console.log('Editar:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-md"
                      title="Editar datos del usuario"
                    >
                      <span className="text-base">✏️</span>
                    </button>

                    {/* Botón 🔒 (Bloquear/Habilitar) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Toggle bloqueo
                        console.log('Toggle bloqueo:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-md"
                      title={usuario.is_blocked ? 'Habilitar usuario' : 'Bloquear usuario'}
                    >
                      <span className="text-base">{usuario.is_blocked ? '🔓' : '🔒'}</span>
                    </button>

                    {/* Botón 👁️ (Ocultar/Mostrar) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Toggle visibilidad
                        console.log('Toggle visibilidad:', usuario.username);
                      }}
                      className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-md"
                      title={usuario.is_hidden ? 'Mostrar en lista' : 'Ocultar de lista'}
                    >
                      <span className="text-base">{usuario.is_hidden ? '👁️' : '👁️'}</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay usuarios registrados
              </p>
            )}
          </div>
        </div>

        {/* Gestión de Cartones (Usuario Seleccionado del Árbol) */}
        {usuarioSeleccionado && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="bg-blue-500 text-white text-center py-3 rounded-t-lg -mx-6 -mt-6 mb-6">
              <h3 className="text-xl font-bold">
                Cartones de {usuarioSeleccionado.username}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Cartones Bronce */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                    <span className="font-bold text-orange-900">BRONCE</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-900">{cartones.bronce}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'bronce', 1)}
                    className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    + Agregar
                  </button>
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'bronce', -1)}
                    className="flex-1 bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    disabled={cartones.bronce <= 0}
                  >
                    - Quitar
                  </button>
                </div>
              </div>

              {/* Cartones Plata */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-400 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                    <span className="font-bold text-gray-900">PLATA</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{cartones.plata}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'plata', 1)}
                    className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    + Agregar
                  </button>
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'plata', -1)}
                    className="flex-1 bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    disabled={cartones.plata <= 0}
                  >
                    - Quitar
                  </button>
                </div>
              </div>

              {/* Cartones Oro */}
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                    <span className="font-bold text-yellow-900">ORO</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-900">{cartones.oro}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'oro', 1)}
                    className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    + Agregar
                  </button>
                  <button
                    onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'oro', -1)}
                    className="flex-1 bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    disabled={cartones.oro <= 0}
                  >
                    - Quitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel Derecho: Árbol Jerárquico */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-blue-500 text-white text-center py-3 rounded-t-lg -mx-6 -mt-6 mb-6">
          <h3 className="text-xl font-bold">Árbol de Usuarios</h3>
        </div>

        <div className="space-y-1 max-h-[800px] overflow-y-auto">
          {arbolJerarquico.length > 0 ? (
            arbolJerarquico.map(nodo => renderNodoArbol(nodo))
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay usuarios registrados
            </p>
          )}
        </div>

        {usuarioSeleccionado && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">Seleccionado:</p>
            <p className="text-lg font-bold text-blue-700">{usuarioSeleccionado.username}</p>
            <p className="text-xs text-blue-600">ID: {usuarioSeleccionado.id} | Role: {usuarioSeleccionado.role}</p>
          </div>
        )}
      </div>

      {/* Modal de Cargar/Descargar Dinero */}
      {modalDinero.isOpen && (
        <div 
          className="fixed inset-0 z-[10000]" 
          onClick={() => setModalDinero({ ...modalDinero, isOpen: false })}
        >
          <div 
            className="absolute bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-6 min-w-[320px]"
            style={{
              top: `${modalDinero.buttonPosition.top + 10}px`,
              left: `${modalDinero.buttonPosition.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {modalDinero.tipo === 'cargar' ? '💵 Cargar Dinero' : '💸 Descargar Dinero'}
              </h3>
              <p className="text-sm text-gray-600">Usuario: <span className="font-semibold">{modalDinero.username}</span></p>
              <p className="text-sm text-gray-600">
                Saldo Actual: <span className="font-bold text-green-600">
                  ${modalDinero.saldoActual.toLocaleString('es-CO')}
                </span>
              </p>
            </div>

            <form onSubmit={procesarMovimientoDinero}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto a {modalDinero.tipo === 'cargar' ? 'cargar' : 'descargar'}:
                </label>
                <input
                  type="number"
                  autoFocus
                  value={modalDinero.monto}
                  onChange={(e) => setModalDinero({ ...modalDinero, monto: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      procesarMovimientoDinero();
                    }
                  }}
                  placeholder="Ingrese el monto"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg font-semibold text-gray-900 placeholder-gray-400"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalDinero({ ...modalDinero, isOpen: false })}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 ${
                    modalDinero.tipo === 'cargar' 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white font-semibold py-2 px-4 rounded-lg transition-colors`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup de Éxito */}
      {showSuccessPopup && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10001] bg-green-500 text-white px-8 py-6 rounded-lg shadow-2xl animate-bounce">
          <p className="text-2xl font-bold text-center">✅ MOVIMIENTO OK</p>
        </div>
      )}

      {/* Modal de Creación de Usuario */}
      {modalCrearUsuario.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
            {/* Tabs: Jugador / Agente */}
            <div className="grid grid-cols-2">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tipoUsuario: 'jugador' })}
                className={`py-4 font-bold text-white transition-colors ${
                  modalCrearUsuario.tipoUsuario === 'jugador' 
                    ? 'bg-red-500' 
                    : 'bg-gray-400 hover:bg-gray-500'
                } rounded-tl-lg flex items-center justify-center gap-2`}
              >
                <span>👤</span>
                <span>Jugador</span>
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tipoUsuario: 'agente' })}
                className={`py-4 font-bold text-white transition-colors ${
                  modalCrearUsuario.tipoUsuario === 'agente' 
                    ? 'bg-blue-500' 
                    : 'bg-gray-400 hover:bg-gray-500'
                } rounded-tr-lg flex items-center justify-center gap-2`}
              >
                <span>🏢</span>
                <span>Agente</span>
              </button>
            </div>

            {/* Tabs: Ingreso / Datos personales */}
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tabActiva: 'ingreso' })}
                className={`flex-1 py-3 font-semibold transition-colors ${
                  modalCrearUsuario.tabActiva === 'ingreso'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Ingreso
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tabActiva: 'datos_personales' })}
                className={`flex-1 py-3 font-semibold transition-colors ${
                  modalCrearUsuario.tabActiva === 'datos_personales'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Datos personales
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              {/* Tab: Ingreso */}
              {modalCrearUsuario.tabActiva === 'ingreso' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xl">👤</span>
                    <input
                      type="text"
                      value={modalCrearUsuario.datosIngreso.username}
                      onChange={(e) => setModalCrearUsuario({
                        ...modalCrearUsuario,
                        datosIngreso: { ...modalCrearUsuario.datosIngreso, username: e.target.value }
                      })}
                      placeholder="Nombre de Usuario"
                      className="flex-1 px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xl">👁️</span>
                    <input
                      type="password"
                      value={modalCrearUsuario.datosIngreso.password}
                      onChange={(e) => setModalCrearUsuario({
                        ...modalCrearUsuario,
                        datosIngreso: { ...modalCrearUsuario.datosIngreso, password: e.target.value }
                      })}
                      placeholder="Contraseña"
                      className="flex-1 px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Datos personales */}
              {modalCrearUsuario.tabActiva === 'datos_personales' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={modalCrearUsuario.datosPersonales.nombre_completo}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, nombre_completo: e.target.value }
                    })}
                    placeholder="Nombre completo (opcional)"
                    className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="text"
                    value={modalCrearUsuario.datosPersonales.documento}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, documento: e.target.value }
                    })}
                    placeholder="Documento (opcional)"
                    className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="email"
                    value={modalCrearUsuario.datosPersonales.email}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, email: e.target.value }
                    })}
                    placeholder="Email (opcional)"
                    className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="tel"
                    value={modalCrearUsuario.datosPersonales.telefono}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, telefono: e.target.value }
                    })}
                    placeholder="Teléfono (opcional)"
                    className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
                  />
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 px-6 pb-6">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, isOpen: false })}
                className="flex-1 py-3 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-50 font-semibold rounded-lg transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleCrearUsuario}
                className="flex-1 py-3 bg-cyan-400 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
