import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import BlockUserModal from './BlockUserModal';
import UnblockUserModal from './UnblockUserModal';

export default function GestionUsuarios({ sharedUserData, sharedCartonesStock, onResourcesUpdate }) {
  const [usuarios, setUsuarios] = useState([]);
  const [allUsersHierarchy, setAllUsersHierarchy] = useState([]); // TODOS los usuarios de la jerarquía (para búsqueda)
  const [arbolJerarquico, setArbolJerarquico] = useState([]);
  const [currentUser, setCurrentUser] = useState({ id: null, role: '', username: '' }); // Usuario actual del backend
  const [agenteSeleccionado, setAgenteSeleccionado] = useState(null); // Agente seleccionado en árbol
  const [usuariosDelAgente, setUsuariosDelAgente] = useState([]); // Usuarios del agente seleccionado
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null); // Usuario seleccionado en listado
  const [nodosExpandidos, setNodosExpandidos] = useState(new Set()); // IDs de nodos expandidos
  const [busquedaUsuario, setBusquedaUsuario] = useState(''); // Campo de búsqueda
  const [cartones, setCartones] = useState({
    bronce: 0,
    plata: 0,
    oro: 0
  });

  // Estado para el modal de gestión de usuario
  const [modalGestionUsuario, setModalGestionUsuario] = useState({
    isOpen: false,
    usuario: null,
    giftCards: { bronce: 0, plata: 0, oro: 0 } // Cartones de regalo
  });

  // Estado para modal de confirmación de operaciones
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    tipo: '', // 'dinero-cargar', 'dinero-descargar', 'cartones-agregar', 'cartones-quitar', 'gift-agregar', 'gift-quitar'
    sala: '', // 'bronce', 'plata', 'oro'
    cantidad: '',
    userId: null,
    isProcessing: false, // Prevenir múltiples clicks
    isGift: false // Indica si es operación de gift cards
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
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
  const [showPasswordCreate, setShowPasswordCreate] = useState(false);
  const [passwordStrengthCreate, setPasswordStrengthCreate] = useState({ level: 0, text: '', color: '' });

  // Estado para modal de información del usuario
  const [modalInformacion, setModalInformacion] = useState({
    isOpen: false,
    usuario: null,
    estructura: [], // Camino desde el panel hasta el usuario
    agentesCount: 0,
    jugadoresCount: 0,
    parent: null
  });

  // Estado para modal de cambio de contraseña
  const [modalCambiarPassword, setModalCambiarPassword] = useState({
    isOpen: false,
    usuario: null,
    newPassword: '',
    confirmPassword: '',
    showPassword: false,
    isProcessing: false
  });
  const [passwordStrengthChange, setPasswordStrengthChange] = useState({ level: 0, text: '', color: '' });

  // Estado para modal de modificar datos personales
  const [modalModificar, setModalModificar] = useState({
    isOpen: false,
    usuario: null,
    datosPersonales: {
      nombre_completo: '',
      documento: '',
      email: '',
      telefono: ''
    },
    isProcessing: false
  });

  // Estados para modales de bloqueo/desbloqueo
  const [modalBlockUser, setModalBlockUser] = useState({
    isOpen: false,
    usuario: null
  });
  const [modalUnblockUser, setModalUnblockUser] = useState({
    isOpen: false,
    usuario: null
  });
  const [modalUsuarioBloqueado, setModalUsuarioBloqueado] = useState({
    isOpen: false,
    usuario: null
  });

  useEffect(() => {
    cargarUsuarios();

    // Escuchar evento del Dashboard para abrir modal de creación
    const handleOpenCreateModal = (event) => {
      console.log('🟢 GestionUsuarios recibió evento openCreateUserModal:', event.detail);
      abrirModalCrearUsuario(event.detail.role);
    };

    // Escuchar evento para abrir modal de gestión desde búsqueda rápida
    const handleOpenManagementModal = async (event) => {
      console.log('🟢 GestionUsuarios recibió evento openUserManagementModal:', event.detail);
      const user = event.detail.user;
      // Normalizar balance a número y mantener cartones separados
      const normalizedUser = {
        ...user,
        balance: parseFloat(user.balance) || 0,
        cards_bronce: parseInt(user.cards_bronce) || 0,
        cards_plata: parseInt(user.cards_plata) || 0,
        cards_oro: parseInt(user.cards_oro) || 0,
        gift_bronce: parseInt(user.gift_bronce) || 0,
        gift_plata: parseInt(user.gift_plata) || 0,
        gift_oro: parseInt(user.gift_oro) || 0
      };

      // Cargar gift cards del usuario desde el endpoint
      const giftCards = await cargarGiftCards(user.id);
      console.log('🎁 Gift cards cargados para', user.username, ':', giftCards);

      setModalGestionUsuario({
        isOpen: true,
        usuario: normalizedUser,
        giftCards: giftCards
      });
    };

    console.log('🟡 GestionUsuarios montado - registrando listeners');
    window.addEventListener('openCreateUserModal', handleOpenCreateModal);
    window.addEventListener('openUserManagementModal', handleOpenManagementModal);

    return () => {
      console.log('🔴 GestionUsuarios desmontado - removiendo listeners');
      window.removeEventListener('openCreateUserModal', handleOpenCreateModal);
      window.removeEventListener('openUserManagementModal', handleOpenManagementModal);
    };
  }, []);

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/users/hierarchy', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Normalizar datos: convertir balance a número y mantener cartones separados
      const normalizedUsers = (response.data.all || []).map(user => ({
        ...user,
        balance: parseFloat(user.balance) || 0,
        cards_bronce: parseInt(user.cards_bronce) || 0,
        cards_plata: parseInt(user.cards_plata) || 0,
        cards_oro: parseInt(user.cards_oro) || 0,
        gift_bronce: parseInt(user.gift_bronce) || 0,
        gift_plata: parseInt(user.gift_plata) || 0,
        gift_oro: parseInt(user.gift_oro) || 0
      }));

      setArbolJerarquico(response.data.tree || []);
      setUsuarios(normalizedUsers);
      setAllUsersHierarchy(normalizedUsers); // Guardar TODOS para búsqueda

      // Guardar información del usuario actual (dueño del panel)
      if (response.data.currentUser) {
        // Buscar el usuario completo con balance en la lista
        const currentUserComplete = normalizedUsers.find(u => u.id === response.data.currentUser.id);
        const updatedUser = {
          ...response.data.currentUser,
          balance: currentUserComplete?.balance || 0,
          cards_bronce: currentUserComplete?.cards_bronce || 0,
          cards_plata: currentUserComplete?.cards_plata || 0,
          cards_oro: currentUserComplete?.cards_oro || 0,
          gift_bronce: currentUserComplete?.gift_bronce || 0,
          gift_plata: currentUserComplete?.gift_plata || 0,
          gift_oro: currentUserComplete?.gift_oro || 0
        };

        setCurrentUser(updatedUser);

        // Actualizar recursos compartidos con el Dashboard
        // Para agentes: sumar normales + regalo, para SuperAdmin: solo normales
        if (onResourcesUpdate) {
          const role = response.data.currentUser.role;
          onResourcesUpdate(updatedUser, {
            bronce: role === 'agente'
              ? (updatedUser.cards_bronce || 0) + (updatedUser.gift_bronce || 0)
              : updatedUser.cards_bronce || 0,
            plata: role === 'agente'
              ? (updatedUser.cards_plata || 0) + (updatedUser.gift_plata || 0)
              : updatedUser.cards_plata || 0,
            oro: role === 'agente'
              ? (updatedUser.cards_oro || 0) + (updatedUser.gift_oro || 0)
              : updatedUser.cards_oro || 0
          });
        }

        // Si es superadmin o agente principal, seleccionarlo automáticamente
        if (response.data.currentUser.role === 'superadmin' || response.data.currentUser.role === 'agente') {
          setAgenteSeleccionado({
            ...response.data.currentUser,
            balance: currentUserComplete?.balance || 0
          });
          cargarUsuariosDelAgente(response.data.currentUser.id, normalizedUsers);
          // Expandir automáticamente el nodo raíz
          setNodosExpandidos(new Set([response.data.currentUser.id]));
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  // Obtener TODOS los usuarios de la red de un agente (recursivo)
  const obtenerRedCompleta = (agenteId, todosLosUsuarios) => {
    const red = [];
    const hijosDirectos = todosLosUsuarios.filter(u => u.parent_id === agenteId);

    hijosDirectos.forEach(hijo => {
      red.push(hijo);
      // Recursivamente obtener la red de los sub-agentes
      if (hijo.role === 'agente') {
        const subRed = obtenerRedCompleta(hijo.id, todosLosUsuarios);
        red.push(...subRed);
      }
    });

    return red;
  };

  // Cargar usuarios de un agente específico (red completa)
  const cargarUsuariosDelAgente = (agenteId, todosLosUsuarios) => {
    if (!todosLosUsuarios || todosLosUsuarios.length === 0) {
      todosLosUsuarios = allUsersHierarchy.length > 0 ? allUsersHierarchy : usuarios;
    }

    // Obtener TODA la red del agente (hijos + descendientes)
    const redCompleta = obtenerRedCompleta(agenteId, todosLosUsuarios);

    // Ordenar: primero agentes, luego jugadores, AMBOS alfabéticamente
    const ordenados = redCompleta.sort((a, b) => {
      if (a.role === 'agente' && b.role !== 'agente') return -1;
      if (a.role !== 'agente' && b.role === 'agente') return 1;
      // Dentro de cada categoría, ordenar alfabéticamente
      return a.username.localeCompare(b.username);
    });

    setUsuariosDelAgente(ordenados);
  };

  // Cargar cartones de regalo de un usuario
  const cargarGiftCards = async (userId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/gift-cards/stock/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        return response.data.giftCards;
      }
      return { bronce: 0, plata: 0, oro: 0 };
    } catch (error) {
      console.error('Error cargando gift cards:', error);
      return { bronce: 0, plata: 0, oro: 0 };
    }
  };

  const abrirModalCrearUsuario = (tipo) => {
    console.log('🟣 Abriendo modal de creación para:', tipo);
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

  // Función para abrir modal de información
  const abrirModalInformacion = async (usuario) => {
    try {
      // 1. Construir estructura jerárquica (código existente...)
      const estructura = [];
      let currentId = usuario.parent_id;
      const todosUsuarios = allUsersHierarchy.length > 0 ? allUsersHierarchy : usuarios;

      while (currentId) {
        const parent = todosUsuarios.find(u => u.id === currentId);
        if (parent) {
          estructura.unshift(parent.username);
          currentId = parent.parent_id;
        } else {
          break;
        }
      }
      estructura.push(usuario.username);

      const parent = todosUsuarios.find(u => u.id === usuario.parent_id);
      const hijosDirectos = todosUsuarios.filter(u => u.parent_id === usuario.id);
      const agentesCount = hijosDirectos.filter(u => u.role === 'agente' || u.role === 'superadmin').length;
      const jugadoresCount = hijosDirectos.filter(u => u.role === 'jugador').length;

      // 2. Fetch Gamification Stats (solo si es jugador)
      let gamificationStats = null;
      if (usuario.role === 'jugador') {
        try {
          const token = localStorage.getItem('adminToken');
          const res = await axios.get(`/api/gamification/admin/player/${usuario.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) {
            gamificationStats = res.data.stats;
          }
        } catch (err) {
          console.error('Error fetching player gamification details', err);
        }
      }

      setModalInformacion({
        isOpen: true,
        usuario: usuario,
        estructura: estructura,
        agentesCount: agentesCount,
        jugadoresCount: jugadoresCount,
        parent: parent,
        gamificationStats: gamificationStats // Datos nuevos
      });

    } catch (error) {
      console.error('Error abriendo modal de información:', error);
    }
  };

  // Función para cambiar contraseña de usuario
  const handleCambiarPassword = async () => {
    const { newPassword, confirmPassword, usuario } = modalCambiarPassword;

    // Validaciones
    if (!newPassword || !confirmPassword) {
      setErrorMessage('❌ Debe completar ambos campos de contraseña');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('❌ Las contraseñas no coinciden');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('❌ La contraseña debe tener al menos 6 caracteres');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
      return;
    }

    setModalCambiarPassword(prev => ({ ...prev, isProcessing: true }));

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        '/api/admin/users/change-password',
        {
          userId: usuario.id,
          newPassword: newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccessMessage(`✅ Contraseña de ${usuario.username} actualizada correctamente`);
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);

        // Cerrar modal
        setModalCambiarPassword({
          isOpen: false,
          usuario: null,
          newPassword: '',
          confirmPassword: '',
          showPassword: false,
          isProcessing: false
        });
        setPasswordStrengthChange({ level: 0, text: '', color: '' });
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      setErrorMessage(error.response?.data?.error || '❌ Error al cambiar la contraseña');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
      setModalCambiarPassword(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Función para guardar modificación de datos personales
  const handleModificarUsuario = async () => {
    const { usuario, datosPersonales } = modalModificar;

    setModalModificar(prev => ({ ...prev, isProcessing: true }));

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/users/${usuario.id}/personal-data`,
        datosPersonales,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccessMessage(`✅ Datos de ${usuario.username} actualizados correctamente`);
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);

        // Recargar jerarquía para actualizar datos
        const hierarchyResponse = await axios.get('/api/admin/users/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (hierarchyResponse.data.success) {
          const allUsers = hierarchyResponse.data.all || [];
          setAllUsersHierarchy(allUsers);

          // Actualizar usuarios del agente si hay uno seleccionado
          if (agenteSeleccionado) {
            cargarUsuariosDelAgente(agenteSeleccionado.id, allUsers);
          }
        }

        // Cerrar modal
        setModalModificar({
          isOpen: false,
          usuario: null,
          datosPersonales: {
            nombre_completo: '',
            documento: '',
            email: '',
            telefono: ''
          },
          isProcessing: false
        });
      }
    } catch (error) {
      console.error('Error modificando usuario:', error);
      setErrorMessage(error.response?.data?.error || '❌ Error al modificar los datos');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
      setModalModificar(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, text: 'Débil', color: 'text-red-500' };
    if (strength <= 3) return { level: 2, text: 'Media', color: 'text-yellow-500' };
    return { level: 3, text: 'Fuerte', color: 'text-green-500' };
  };

  // Funciones para bloqueo/desbloqueo de usuarios
  const handleBlockUser = async (reason) => {
    try {
      const token = localStorage.getItem('adminToken');
      const { usuario } = modalBlockUser;

      const response = await axios.post(
        `/api/users/${usuario.id}/block`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccessMessage(`🔒 Usuario ${usuario.username} bloqueado correctamente`);
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);

        // Recargar usuarios para reflejar cambio
        await cargarUsuarios();

        // Cerrar modal
        setModalBlockUser({ isOpen: false, usuario: null });
      }
    } catch (error) {
      console.error('Error bloqueando usuario:', error);
      setErrorMessage(error.response?.data?.error || '❌ Error al bloquear el usuario');
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
    }
  };

  const handleUnblockUser = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { usuario } = modalUnblockUser;

      const response = await axios.post(
        `/api/users/${usuario.id}/unblock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccessMessage(`🔓 Usuario ${usuario.username} desbloqueado correctamente`);
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);

        // Recargar usuarios para reflejar cambio
        await cargarUsuarios();

        // Cerrar modal
        setModalUnblockUser({ isOpen: false, usuario: null });
      }
    } catch (error) {
      console.error('Error desbloqueando usuario:', error);
      const errorData = error.response?.data;
      const errorMsg = errorData?.reason || errorData?.error || '❌ Error al desbloquear el usuario';
      setErrorMessage(errorMsg);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 5000);
    }
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

      // Solo superadmin puede seleccionar parent_id, otros usuarios siempre crean hijos directos
      const parentId = currentUser.role === 'superadmin' && agenteSeleccionado
        ? agenteSeleccionado.id
        : currentUser.id;

      const userData = {
        username: datosIngreso.username,
        password: datosIngreso.password,
        role: tipoUsuario,
        parent_id: parentId,
        // Datos personales opcionales
        ...(datosPersonales.nombre_completo && { nombre_completo: datosPersonales.nombre_completo }),
        ...(datosPersonales.documento && { documento: datosPersonales.documento }),
        ...(datosPersonales.email && { email: datosPersonales.email }),
        ...(datosPersonales.telefono && { telefono: datosPersonales.telefono })
      };

      const response = await axios.post('/api/admin/users/create', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Mostrar popup de éxito
      setSuccessMessage(`${tipoUsuario.toUpperCase()} "${datosIngreso.username}" creado exitosamente`);
      setShowSuccessPopup(true);

      // Desvanecer popup después de 3 segundos
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);

      // Cerrar modal después de 500ms
      setTimeout(() => {
        setModalCrearUsuario({ ...modalCrearUsuario, isOpen: false });
      }, 500);

      // Recargar jerarquía completa
      const hierarchyResponse = await axios.get('/api/admin/users/hierarchy', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setArbolJerarquico(hierarchyResponse.data.tree || []);
      setUsuarios(hierarchyResponse.data.all || []);
      setAllUsersHierarchy(hierarchyResponse.data.all || []); // Actualizar búsqueda global

      // Actualizar lista de usuarios del agente seleccionado
      if (agenteSeleccionado) {
        cargarUsuariosDelAgente(agenteSeleccionado.id, hierarchyResponse.data.all || []);
      }

      // Expandir nodo del parent donde se creó el usuario
      if (userData.parent_id) {
        setNodosExpandidos(prev => new Set([...prev, userData.parent_id]));
      }
    } catch (error) {
      setErrorMessage('Error creando usuario: ' + (error.response?.data?.error || error.message));
      setShowErrorPopup(true);
      setTimeout(() => {
        setShowErrorPopup(false);
      }, 3000);
    }
  };

  const handleGrantAchievement = async (userId, username) => {
    // Lista rápida de logros comunes para referencia
    const code = prompt(`Ingresa el CÓDIGO del logro a otorgar a ${username}:\n\nEjemplos:\n- first_win\n- high_roller\n- early_bird\n- night_owl\n- bingo_master\n- social_butterfly`);

    if (!code) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/gamification/admin/unlock-achievement', {
        userId: userId,
        achievementType: code
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccessMessage(`✅ Logro "${code}" otorgado correctamente`);
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 3000);

        // Recargar datos si el modal de info está abierto
        if (modalInformacion.isOpen && modalInformacion.usuario?.id === userId) {
          abrirModalInformacion(modalInformacion.usuario); // Recargar
        }
      }
    } catch (error) {
      alert('❌ Error al otorgar logro: ' + (error.response?.data?.error || error.message));
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
      saldoActual: parseFloat(usuario.balance) || 0,
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

    const balanceActual = parseFloat(usuario.balance) || 0;

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

      // Cerrar modal de dinero
      setModalDinero({ isOpen: false, tipo: null, userId: null, username: '', saldoActual: 0, monto: '', buttonPosition: null });

      // Mostrar popup de éxito
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2000);

      // Recargar usuarios y actualizar modal de gestión con datos frescos
      const response = await axios.get('/api/admin/users/hierarchy', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Actualizar lista de usuarios
      setUsuarios(response.data.all || []);
      setArbolJerarquico(response.data.tree || []);
      setAllUsersHierarchy(response.data.all || []); // Actualizar búsqueda global

      // CRÍTICO: Actualizar el modal de gestión si está abierto para el mismo usuario
      if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
        const usuarioActualizado = response.data.all.find(u => u.id === userId);
        if (usuarioActualizado) {
          console.log('✅ Modal actualizado - Balance anterior:', modalGestionUsuario.usuario.balance, 'Nuevo balance:', usuarioActualizado.balance);
          const giftCards = await cargarGiftCards(userId);
          setModalGestionUsuario({
            ...modalGestionUsuario,
            usuario: usuarioActualizado, // Reemplazar TODO el objeto usuario con datos frescos
            giftCards: giftCards
          });
        }
      }

      // Actualizar usuarios del agente seleccionado
      if (agenteSeleccionado) {
        cargarUsuariosDelAgente(agenteSeleccionado.id, response.data.all || []);
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.error || error.message));
    }
  };

  // Ejecutar operación confirmada
  const ejecutarOperacion = async () => {
    // Prevenir múltiples ejecuciones
    if (modalConfirmacion.isProcessing) {
      console.log('⏳ Operación ya en proceso, ignorando click...');
      return;
    }

    const { tipo, sala, cantidad, userId } = modalConfirmacion;
    const cantidadNum = parseInt(cantidad);

    console.log('🔍 ejecutarOperacion llamada:', { tipo, sala, cantidad, userId, cantidadNum });

    if (!cantidad || isNaN(cantidadNum) || cantidadNum <= 0) {
      alert('❌ Debes ingresar una cantidad válida');
      return;
    }

    // LIMPIAR mensaje de éxito anterior (evitar que se quede pegado)
    setSuccessMessage('');
    setShowSuccessPopup(false);

    // Bloquear múltiples ejecuciones
    setModalConfirmacion(prev => ({ ...prev, isProcessing: true }));

    try {
      const token = localStorage.getItem('adminToken');

      // SUPERADMIN: Agregar balance sin límites
      if (tipo === 'superadmin-add-balance') {
        console.log('💎 Agregando balance SuperAdmin:', cantidadNum);

        await axios.post('/api/admin/users/add-balance', {
          userId: userId,
          amount: cantidadNum
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Balance agregado exitosamente');

        // Actualizar estado local
        const newBalance = (currentUser.balance || 0) + cantidadNum;
        const newUserData = { ...currentUser, balance: newBalance };
        setCurrentUser(newUserData);
        if (onResourcesUpdate) {
          onResourcesUpdate(newUserData, null);
        }

        setModalConfirmacion({ isOpen: false, tipo: '', sala: '', cantidad: '', userId: null, isProcessing: false, isGift: false });
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 2000);
        await cargarUsuarios();
        return;
      }

      // SUPERADMIN: Agregar cartones sin límites (acreditación directa, no transferencia)
      if (tipo === 'superadmin-add-cards') {
        console.log('💎 Agregando cartones SuperAdmin:', { sala, cantidad: cantidadNum });

        // Usar endpoint de acreditación SuperAdmin (sin límites)
        await axios.post('/api/superadmin/cards/credit', {
          user_id: userId,
          room: sala,
          quantity: cantidadNum,
          is_gift: false,
          reason: `Carga manual por ${currentUser.username}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Cartones agregados exitosamente');

        // Actualizar estado local
        const newCurrentUser = { ...currentUser };
        newCurrentUser[`cards_${sala}`] = (newCurrentUser[`cards_${sala}`] || 0) + cantidadNum;
        setCurrentUser(newCurrentUser);
        if (onResourcesUpdate) {
          onResourcesUpdate(null, {
            bronce: currentUser.role === 'agente'
              ? (newCurrentUser.cards_bronce || 0) + (newCurrentUser.gift_bronce || 0)
              : newCurrentUser.cards_bronce || 0,
            plata: currentUser.role === 'agente'
              ? (newCurrentUser.cards_plata || 0) + (newCurrentUser.gift_plata || 0)
              : newCurrentUser.cards_plata || 0,
            oro: currentUser.role === 'agente'
              ? (newCurrentUser.cards_oro || 0) + (newCurrentUser.gift_oro || 0)
              : newCurrentUser.cards_oro || 0
          });
        }

        setModalConfirmacion({ isOpen: false, tipo: '', sala: '', cantidad: '', userId: null, isProcessing: false, isGift: false });
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 2000);
        await cargarUsuarios();
        return;
      }

      if (tipo === 'dinero-cargar' || tipo === 'dinero-descargar') {
        // Validar recursos disponibles para CARGAR dinero (admin tiene suficiente saldo)
        if (tipo === 'dinero-cargar') {
          const recursosDisponibles = sharedUserData?.balance || currentUser.balance || 0;
          if (cantidadNum > recursosDisponibles) {
            alert(`❌ No tienes suficiente saldo disponible.\nRecursos disponibles: $${recursosDisponibles.toLocaleString('es-CO')}\nIntentaste cargar: $${cantidadNum.toLocaleString('es-CO')}`);
            return;
          }
        }

        // Validar recursos disponibles para DESCARGAR dinero (usuario tiene suficiente saldo)
        if (tipo === 'dinero-descargar') {
          // Usar datos del modal de gestión en lugar de buscar en array
          const usuario = modalGestionUsuario.usuario;
          console.log('💸 Validando descarga:', {
            usuario: usuario ? { id: usuario.id, username: usuario.username, balance: usuario.balance } : null,
            userId,
            cantidadNum
          });

          if (!usuario || usuario.id !== userId) {
            console.error('❌ Usuario no coincide o no encontrado');
            setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
            alert('❌ Usuario no encontrado');
            return;
          }

          const saldoUsuario = parseFloat(usuario.balance) || 0;
          console.log('💰 Saldo del usuario:', saldoUsuario, 'Intentando descargar:', cantidadNum);

          if (cantidadNum > saldoUsuario) {
            setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
            alert(`❌ El usuario no tiene suficiente saldo para descargar.\nSaldo del usuario: $${Math.floor(saldoUsuario).toLocaleString('es-CO')}\nIntentaste descargar: $${cantidadNum.toLocaleString('es-CO')}`);
            return;
          }
        }

        // Operación de dinero
        await axios.post('/api/admin/users/add-balance', {
          userId: userId,
          amount: tipo === 'dinero-cargar' ? cantidadNum : -cantidadNum
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Recargar usuarios y actualizar modal con datos frescos
        const response = await axios.get('/api/admin/users/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Actualizar lista de usuarios
        setUsuarios(response.data.all || []);
        setArbolJerarquico(response.data.tree || []);
        setAllUsersHierarchy(response.data.all || []); // Actualizar búsqueda global

        // CRÍTICO: Actualizar el modal de gestión si está abierto con el usuario completo
        if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
          const usuarioActualizado = response.data.all.find(u => u.id === userId);
          if (usuarioActualizado) {
            console.log('✅ Modal actualizado - Balance anterior:', modalGestionUsuario.usuario.balance, 'Nuevo:', usuarioActualizado.balance);
            const giftCards = await cargarGiftCards(userId);
            setModalGestionUsuario({
              ...modalGestionUsuario,
              usuario: usuarioActualizado, // Reemplazar TODO el objeto con datos frescos
              giftCards: giftCards
            });
          }
        }

        // Actualizar usuarios del agente seleccionado
        if (agenteSeleccionado) {
          cargarUsuariosDelAgente(agenteSeleccionado.id, response.data.all || []);
        }

        // DESPUÉS de recargar, actualizar recursos del admin si cargó/descargó a otro usuario
        if (tipo === 'dinero-cargar' && userId !== currentUser.id && onResourcesUpdate) {
          const newAdminBalance = (currentUser.balance || 0) - cantidadNum;
          const newUserData = { ...currentUser, balance: newAdminBalance };
          setCurrentUser(newUserData);
          onResourcesUpdate(newUserData, null);
        }

        if (tipo === 'dinero-descargar' && userId !== currentUser.id && onResourcesUpdate) {
          const newAdminBalance = (currentUser.balance || 0) + cantidadNum;
          const newUserData = { ...currentUser, balance: newAdminBalance };
          setCurrentUser(newUserData);
          onResourcesUpdate(newUserData, null);
        }
      } else if (tipo === 'gift-agregar' || tipo === 'gift-quitar') {
        // OPERACIONES DE GIFT CARDS
        const isAdd = tipo === 'gift-agregar';
        const endpoint = isAdd ? '/api/admin/gift-cards/add' : '/api/admin/gift-cards/remove';

        // Validar para quitar
        if (!isAdd) {
          const giftCardsActuales = modalGestionUsuario.giftCards?.[sala] || 0;
          if (cantidadNum > giftCardsActuales) {
            setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
            alert(`❌ El usuario solo tiene ${giftCardsActuales} cartón(es) de regalo de ${sala.toUpperCase()}.\nNo se pueden quitar ${cantidadNum}.`);
            return;
          }
        }

        await axios.post(endpoint, {
          userId: userId,
          room: sala,
          quantity: cantidadNum,
          isGift: true
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Recargar gift cards y actualizar modal completo
        const giftCards = await cargarGiftCards(userId);

        // Recargar usuarios completos
        const response = await axios.get('/api/admin/users/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUsuarios(response.data.all || []);
        setArbolJerarquico(response.data.tree || []);
        setAllUsersHierarchy(response.data.all || []); // Actualizar búsqueda global

        // Actualizar modal con usuario completo + gift cards
        if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
          const usuarioActualizado = response.data.all.find(u => u.id === userId);
          if (usuarioActualizado) {
            console.log('✅ Modal actualizado - Gift cards', sala, ':', giftCards[sala]);
            setModalGestionUsuario({
              ...modalGestionUsuario,
              usuario: usuarioActualizado,
              giftCards: giftCards
            });
          }
        }

        // Actualizar usuarios del agente seleccionado
        if (agenteSeleccionado) {
          cargarUsuariosDelAgente(agenteSeleccionado.id, response.data.all || []);
        }
      } else {
        // OPERACIONES DE CARTONES NORMALES
        if (tipo === 'cartones-quitar') {
          const usuario = modalGestionUsuario.usuario;
          if (!usuario || usuario.id !== userId) {
            console.error('❌ Usuario no coincide o no encontrado');
            setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
            alert('❌ Usuario no encontrado');
            return;
          }

          const cartonesActuales = parseInt(usuario[`cards_${sala}`]) || 0;
          console.log('🎫 Validando quitar cartones:', { sala, cartonesActuales, cantidadNum });

          if (cantidadNum > cartonesActuales) {
            setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
            alert(`❌ El usuario solo tiene ${cartonesActuales} cartón(es) de ${sala.toUpperCase()}.\nNo se pueden quitar ${cantidadNum} cartones.`);
            return;
          }
        }

        // Operación de cartones (agregar o quitar)
        const cantidadFinal = (tipo === 'cartones-agregar' ? 1 : -1) * cantidadNum;

        console.log('📤 Enviando request add-cards:', { userId, room: sala, quantity: cantidadFinal });

        const cardsResponse = await axios.post('/api/admin/users/add-cards', {
          userId: userId,
          room: sala,
          quantity: cantidadFinal
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Respuesta add-cards:', cardsResponse.data);

        // Recargar usuarios y actualizar modal con datos frescos
        const response = await axios.get('/api/admin/users/hierarchy', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Actualizar lista de usuarios Y árbol jerárquico
        setUsuarios(response.data.all || []);
        setArbolJerarquico(response.data.tree || []);
        setAllUsersHierarchy(response.data.all || []); // Actualizar búsqueda global

        // CRÍTICO: Actualizar currentUser con datos frescos para cálculos posteriores
        const currentUserFresco = response.data.all.find(u => u.id === currentUser.id);
        if (currentUserFresco) {
          setCurrentUser(currentUserFresco);
        }

        // CRÍTICO: Actualizar el modal con el usuario completo
        if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
          const usuarioActualizado = response.data.all.find(u => u.id === userId);
          if (usuarioActualizado) {
            console.log('✅ Modal actualizado - Cartones', sala, ':', usuarioActualizado[`cards_${sala}`]);
            const giftCards = await cargarGiftCards(userId);
            setModalGestionUsuario({
              ...modalGestionUsuario,
              usuario: usuarioActualizado, // Reemplazar TODO el objeto
              giftCards: giftCards
            });
          }
        }

        // Actualizar vista del agente seleccionado
        if (agenteSeleccionado) {
          cargarUsuariosDelAgente(agenteSeleccionado.id, response.data.all || []);
        }

        // DESPUÉS de recargar, actualizar recursos del admin si transfirió cartones a otro usuario
        if (tipo === 'cartones-agregar' && userId !== currentUser.id && onResourcesUpdate && currentUserFresco) {
          // Usar datos frescos del admin para mostrar en panel
          const newAdminCards = {
            bronce: currentUser.role === 'agente'
              ? (currentUserFresco.cards_bronce || 0) + (currentUserFresco.gift_bronce || 0)
              : currentUserFresco.cards_bronce || 0,
            plata: currentUser.role === 'agente'
              ? (currentUserFresco.cards_plata || 0) + (currentUserFresco.gift_plata || 0)
              : currentUserFresco.cards_plata || 0,
            oro: currentUser.role === 'agente'
              ? (currentUserFresco.cards_oro || 0) + (currentUserFresco.gift_oro || 0)
              : currentUserFresco.cards_oro || 0
          };
          onResourcesUpdate(null, newAdminCards);
        }

        if (tipo === 'cartones-quitar' && userId !== currentUser.id && onResourcesUpdate && currentUserFresco) {
          // Usar datos frescos del admin para mostrar en panel
          const newAdminCards = {
            bronce: currentUser.role === 'agente'
              ? (currentUserFresco.cards_bronce || 0) + (currentUserFresco.gift_bronce || 0)
              : currentUserFresco.cards_bronce || 0,
            plata: currentUser.role === 'agente'
              ? (currentUserFresco.cards_plata || 0) + (currentUserFresco.gift_plata || 0)
              : currentUserFresco.cards_plata || 0,
            oro: currentUser.role === 'agente'
              ? (currentUserFresco.cards_oro || 0) + (currentUserFresco.gift_oro || 0)
              : currentUserFresco.cards_oro || 0
          };
          onResourcesUpdate(null, newAdminCards);
        }

        // Si es el usuario actual, actualizar recursos compartidos con Dashboard
        if (userId === currentUser.id && onResourcesUpdate) {
          try {
            const response = await axios.get('/api/admin/users/hierarchy', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const usuarioActualizado = response.data.all.find(u => u.id === userId);
            if (usuarioActualizado) {
              const newCurrentUser = {
                ...currentUser,
                cards_bronce: parseInt(usuarioActualizado.cards_bronce) || 0,
                cards_plata: parseInt(usuarioActualizado.cards_plata) || 0,
                cards_oro: parseInt(usuarioActualizado.cards_oro) || 0,
                gift_bronce: parseInt(usuarioActualizado.gift_bronce) || 0,
                gift_plata: parseInt(usuarioActualizado.gift_plata) || 0,
                gift_oro: parseInt(usuarioActualizado.gift_oro) || 0
              };
              setCurrentUser(newCurrentUser);
              onResourcesUpdate(null, {
                bronce: currentUser.role === 'agente'
                  ? (newCurrentUser.cards_bronce || 0) + (newCurrentUser.gift_bronce || 0)
                  : newCurrentUser.cards_bronce,
                plata: currentUser.role === 'agente'
                  ? (newCurrentUser.cards_plata || 0) + (newCurrentUser.gift_plata || 0)
                  : newCurrentUser.cards_plata,
                oro: currentUser.role === 'agente'
                  ? (newCurrentUser.cards_oro || 0) + (newCurrentUser.gift_oro || 0)
                  : newCurrentUser.cards_oro
              });
            }
          } catch (error) {
            console.error('Error actualizando recursos:', error);
          }
        }
      }

      // Cerrar modal y resetear estado
      setModalConfirmacion({ isOpen: false, tipo: '', sala: '', cantidad: '', userId: null, isProcessing: false, isGift: false });

    } catch (error) {
      console.error('❌ Error en ejecutarOperacion:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        tipo,
        sala,
        cantidad,
        userId
      });
      setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));

      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Error desconocido';
      setErrorMessage(`Error en operación: ${errorMsg}`);
      setShowErrorPopup(true);
      setTimeout(() => {
        setShowErrorPopup(false);
      }, 4000);
    }
  };

  // Verificar si un nodo tiene hijos (agentes o jugadores)
  const tieneHijos = (nodoId) => {
    return usuarios.some(u => u.parent_id === nodoId);
  };

  // Verificar si un nodo tiene sub-agentes
  const tieneSubAgentes = (nodoId) => {
    return usuarios.some(u => u.parent_id === nodoId && u.role === 'agente');
  };

  // Toggle expansión de nodo
  const toggleNodo = (nodoId) => {
    const newExpanded = new Set(nodosExpandidos);
    if (newExpanded.has(nodoId)) {
      newExpanded.delete(nodoId);
    } else {
      newExpanded.add(nodoId);
    }
    setNodosExpandidos(newExpanded);
  };

  // Renderizar árbol completo (superadmin/agentes muestran su red completa)
  const renderArbolReferidos = (nodo, nivel = 0) => {
    const marginLeft = nivel * 24;
    const esSeleccionado = agenteSeleccionado?.id === nodo.id;
    const tieneHijosFlag = tieneHijos(nodo.id);
    const tieneSubAgentesFlag = tieneSubAgentes(nodo.id);
    const estaExpandido = nodosExpandidos.has(nodo.id);

    // Iconos según rol
    const iconoRole = {
      'superadmin': '👑',
      'agente': '🏢',
      'jugador': '👤'
    }[nodo.role] || '👤';

    return (
      <div key={nodo.id}>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${esSeleccionado
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
            : 'hover:bg-gray-700/50 text-gray-200'
            }`}
          style={{ marginLeft: `${marginLeft}px` }}
        >
          {/* Indicador de expansión */}
          {tieneHijosFlag ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodo(nodo.id);
              }}
              className="w-4 h-4 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
            >
              <span className="text-xs">{estaExpandido ? '▼' : '▶'}</span>
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
            </div>
          )}

          {/* Contenido del nodo */}
          <div
            className="flex items-center gap-2 flex-1 text-sm"
            onClick={async () => {
              setAgenteSeleccionado(nodo);

              // Recargar jerarquía completa para obtener TODOS los usuarios
              const token = localStorage.getItem('adminToken');
              const hierarchyResponse = await axios.get('/api/admin/users/hierarchy', {
                headers: { Authorization: `Bearer ${token}` }
              });

              const allUsers = hierarchyResponse.data.all || [];
              setAllUsersHierarchy(allUsers); // Actualizar todos los usuarios

              // Cargar usuarios del agente con datos actualizados
              cargarUsuariosDelAgente(nodo.id, allUsers);
              setUsuarioSeleccionado(null);
            }}
          >
            {/* Icono según rol */}
            <span className="text-lg">{iconoRole}</span>

            {/* Nombre */}
            <span className="font-medium flex-1">{nodo.username}</span>

            {/* Punto amarillo si tiene sub-agentes */}
            {tieneSubAgentesFlag && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg"></div>
            )}
          </div>
        </div>

        {/* Renderizar todos los hijos si está expandido */}
        {tieneHijosFlag && estaExpandido && nodo.children && (
          nodo.children
            .sort((a, b) => {
              // Ordenar por ID descendente (más recientes primero = arriba en el árbol)
              return b.id - a.id;
            })
            .map(child => renderArbolReferidos(child, nivel + 1))
        )}
      </div>
    );
  };

  return (
    <>
      {/* Contenido principal del componente */}
      <div data-section="usuarios-active">
        {/* Panel de Recursos Disponibles - Sincronizado con botón Recursos */}
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            💼 Recursos Disponibles - Panel de {sharedUserData?.username || currentUser.username}
            {currentUser.role === 'superadmin' && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold ml-2">SUPERADMIN</span>
            )}
          </h2>
          <div className={`grid gap-4 ${currentUser.role === 'superadmin' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
            {/* Balance */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
              <p className="text-sm text-purple-200">Balance</p>
              <p className="text-2xl font-bold text-white mb-2">${Math.floor((sharedUserData?.balance || currentUser.balance) || 0).toLocaleString('es-CO')}</p>
              {currentUser.role === 'superadmin' && (
                <button
                  onClick={() => {
                    console.log('🔍 Click en +Balance, currentUser:', currentUser);
                    setModalConfirmacion({
                      isOpen: true,
                      tipo: 'superadmin-add-balance',
                      sala: '',
                      cantidad: '',
                      userId: currentUser.id
                    });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                  title="Agregar balance"
                >
                  +
                </button>
              )}
            </div>

            {/* Cartones Bronce */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
              <p className="text-sm text-orange-200">Cartones Bronce</p>
              <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.bronce || currentUser.cards_bronce || 0).toLocaleString('es-CO')}</p>
              {currentUser.role === 'superadmin' && (
                <button
                  onClick={() => {
                    setModalConfirmacion({
                      isOpen: true,
                      tipo: 'superadmin-add-cards',
                      sala: 'bronce',
                      cantidad: '',
                      userId: currentUser.id
                    });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                  title="Agregar cartones bronce"
                >
                  +
                </button>
              )}
            </div>

            {/* Cartones Plata */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
              <p className="text-sm text-gray-200">Cartones Plata</p>
              <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.plata || currentUser.cards_plata || 0).toLocaleString('es-CO')}</p>
              {currentUser.role === 'superadmin' && (
                <button
                  onClick={() => {
                    setModalConfirmacion({
                      isOpen: true,
                      tipo: 'superadmin-add-cards',
                      sala: 'plata',
                      cantidad: '',
                      userId: currentUser.id
                    });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                  title="Agregar cartones plata"
                >
                  +
                </button>
              )}
            </div>

            {/* Cartones Oro */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 relative">
              <p className="text-sm text-yellow-200">Cartones Oro</p>
              <p className="text-2xl font-bold text-white mb-2">{(sharedCartonesStock?.oro || currentUser.cards_oro || 0).toLocaleString('es-CO')}</p>
              {currentUser.role === 'superadmin' && (
                <button
                  onClick={() => {
                    setModalConfirmacion({
                      isOpen: true,
                      tipo: 'superadmin-add-cards',
                      sala: 'oro',
                      cantidad: '',
                      userId: currentUser.id
                    });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-all hover:scale-110"
                  title="Agregar cartones oro"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Árbol de Referidos (solo agentes) */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-4 rounded-xl mb-6">
              <h3 className="text-2xl font-bold">🌳 Árbol de Referidos</h3>
              <p className="text-sm text-indigo-200 mt-1">Panel de {currentUser.username || agenteSeleccionado?.username || 'Usuario'}</p>
            </div>

            {/* Botones de creación */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => abrirModalCrearUsuario('jugador')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
              >
                <span>👤</span>
                <span>Nuevo Jugador</span>
              </button>

              {(currentUser.role === 'superadmin' || currentUser.role === 'agente') && (
                <button
                  onClick={() => abrirModalCrearUsuario('agente')}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  <span>🏢</span>
                  <span>Nuevo Agente</span>
                </button>
              )}
            </div>

            {/* Árbol de solo agentes */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {arbolJerarquico.length > 0 ? (
                arbolJerarquico.map(nodo => renderArbolReferidos(nodo))
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No hay agentes en la red
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Listado de Usuarios del agente seleccionado */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-4 rounded-xl mb-6">
              <h3 className="text-2xl font-bold">📋 Listado de Usuarios</h3>
              {agenteSeleccionado && (
                <p className="text-sm text-blue-200 mt-1">
                  Red de: {agenteSeleccionado.username}
                </p>
              )}
            </div>

            {/* Campo de búsqueda */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar en toda la red..."
                  value={busquedaUsuario}
                  onChange={(e) => setBusquedaUsuario(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <span className="absolute left-3 top-3.5 text-gray-400 text-lg">🔍</span>
                {busquedaUsuario && (
                  <button
                    onClick={() => setBusquedaUsuario('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              {busquedaUsuario && (() => {
                // BUSCAR EN TODA LA BASE DE DATOS, no solo en red del agente
                const baseUsuarios = allUsersHierarchy.length > 0 ? allUsersHierarchy : usuarios;

                // Filtrar directamente en TODOS los usuarios
                const usuariosFiltrados = baseUsuarios.filter(u =>
                  u.username.toLowerCase().includes(busquedaUsuario.toLowerCase())
                );

                return (
                  <p className="text-sm text-gray-400 mt-2">
                    Buscando "{busquedaUsuario}" en TODA la base de datos •
                    <span className="text-green-400 font-semibold ml-1">
                      {usuariosFiltrados.length} encontrado(s) de {baseUsuarios.length} total
                    </span>
                  </p>
                );
              })()}
            </div>

            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {(() => {
                // BUSCAR EN TODA LA BASE DE DATOS cuando hay búsqueda activa
                const baseUsuarios = allUsersHierarchy.length > 0 ? allUsersHierarchy : usuarios;
                const usuariosParaMostrar = busquedaUsuario.trim() !== ''
                  ? baseUsuarios  // BUSCAR EN TODOS, no filtrar por agente
                  : usuariosDelAgente;

                const usuariosFiltrados = usuariosParaMostrar.filter(u =>
                  u.username.toLowerCase().includes(busquedaUsuario.toLowerCase())
                );

                return usuariosFiltrados.length > 0 ? (
                  usuariosFiltrados.map((usuario) => {
                    const esAgente = usuario.role === 'agente';
                    const tieneSubAgentesFlag = esAgente && tieneSubAgentes(usuario.id);

                    return (
                      <div
                        key={usuario.id}
                        onClick={async () => {
                          if (usuario.is_blocked) {
                            setModalUsuarioBloqueado({
                              isOpen: true,
                              usuario: usuario
                            });
                          } else {
                            const giftCards = await cargarGiftCards(usuario.id);
                            setModalGestionUsuario({
                              isOpen: true,
                              usuario: usuario,
                              giftCards: giftCards
                            });
                          }
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all cursor-pointer ${modalGestionUsuario.usuario?.id === usuario.id
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                          : esAgente
                            ? 'bg-indigo-900/30 border-indigo-600/50 text-indigo-200 hover:bg-indigo-900/50'
                            : 'bg-gray-700/30 border-gray-600/50 text-gray-200 hover:bg-gray-700/50'
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl">{esAgente ? '🏢' : '👤'}</span>
                          <div className="flex-1">
                            <p className="font-semibold">{usuario.username}</p>
                            <p className={`text-xs ${modalGestionUsuario.usuario?.id === usuario.id ? 'text-blue-200' : 'text-gray-400'}`}>
                              {esAgente ? 'Agente' : 'Jugador'} • ID: {usuario.id}
                            </p>
                          </div>

                          {/* Indicadores de recursos - ocultos si está bloqueado */}
                          {!usuario.is_blocked && (
                            <div className="flex items-center gap-2">
                              {/* Balance */}
                              <div className="flex items-center gap-1 bg-green-900/30 border border-green-600/40 rounded-lg px-2 py-1">
                                <span className="text-xs text-green-400">💰</span>
                                <span className="text-xs font-semibold text-green-300">
                                  ${Math.floor(usuario.balance || 0).toLocaleString('es-CO')}
                                </span>
                              </div>

                              {/* Cartones Bronce */}
                              {((usuario.cards_bronce || 0) > 0 || (usuario.gift_bronce || 0) > 0) && (
                                <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-600/40 rounded-lg px-2 py-1">
                                  <div className="w-2 h-2 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                                  <span className="text-xs font-semibold text-orange-300">
                                    {currentUser.role === 'superadmin' && (usuario.gift_bronce || 0) > 0
                                      ? `${usuario.cards_bronce || 0}+${usuario.gift_bronce}🎁`
                                      : ((usuario.cards_bronce || 0) + (usuario.gift_bronce || 0)).toLocaleString('es-CO')
                                    }
                                  </span>
                                </div>
                              )}

                              {/* Cartones Plata */}
                              {((usuario.cards_plata || 0) > 0 || (usuario.gift_plata || 0) > 0) && (
                                <div className="flex items-center gap-1 bg-gray-700/30 border border-gray-500/40 rounded-lg px-2 py-1">
                                  <div className="w-2 h-2 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                                  <span className="text-xs font-semibold text-gray-300">
                                    {currentUser.role === 'superadmin' && (usuario.gift_plata || 0) > 0
                                      ? `${usuario.cards_plata || 0}+${usuario.gift_plata}🎁`
                                      : ((usuario.cards_plata || 0) + (usuario.gift_plata || 0)).toLocaleString('es-CO')
                                    }
                                  </span>
                                </div>
                              )}

                              {/* Cartones Oro */}
                              {((usuario.cards_oro || 0) > 0 || (usuario.gift_oro || 0) > 0) && (
                                <div className="flex items-center gap-1 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-2 py-1">
                                  <div className="w-2 h-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                                  <span className="text-xs font-semibold text-yellow-300">
                                    {currentUser.role === 'superadmin' && (usuario.gift_oro || 0) > 0
                                      ? `${usuario.cards_oro || 0}+${usuario.gift_oro}🎁`
                                      : ((usuario.cards_oro || 0) + (usuario.gift_oro || 0)).toLocaleString('es-CO')
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Iconos de acción */}
                          <div className="flex items-center gap-1.5 ml-3">
                            {/* Badge BLOQUEADO - solo visible si el usuario está bloqueado */}
                            {usuario.is_blocked && (
                              <div className="flex items-center gap-1 bg-red-900/50 border border-red-500/50 rounded-lg px-3 py-1 mr-2">
                                <span className="text-red-400 text-xs font-bold">🔒 BLOQUEADO</span>
                              </div>
                            )}

                            {/* Botones de acción - ocultos si el usuario está bloqueado */}
                            {!usuario.is_blocked && (
                              <>
                                {/* Ver información */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirModalInformacion(usuario);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 flex items-center justify-center transition-all hover:scale-110"
                                  title="Ver información"
                                >
                                  <span className="text-cyan-400 text-sm">ℹ️</span>
                                </button>

                                {/* Cambiar Contraseña */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalCambiarPassword({
                                      isOpen: true,
                                      usuario: usuario,
                                      newPassword: '',
                                      confirmPassword: '',
                                      showPassword: false,
                                      isProcessing: false
                                    });
                                  }}
                                  className="w-8 h-8 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-500/30 flex items-center justify-center transition-all hover:scale-110"
                                  title="Cambiar contraseña"
                                >
                                  <span className="text-yellow-400 text-sm">🔑</span>
                                </button>

                                {/* Modificar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalModificar({
                                      isOpen: true,
                                      usuario: usuario,
                                      datosPersonales: {
                                        nombre_completo: usuario.nombre_completo || '',
                                        documento: usuario.documento || '',
                                        email: usuario.email || '',
                                        telefono: usuario.telefono || ''
                                      },
                                      isProcessing: false
                                    });
                                  }}
                                  className="w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 flex items-center justify-center transition-all hover:scale-110"
                                  title="Modificar usuario"
                                >
                                  <span className="text-blue-400 text-sm">✏️</span>
                                </button>

                                {/* Ocultar */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implementar ocultar usuario
                                    console.log('Ocultar usuario:', usuario.username);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 flex items-center justify-center transition-all hover:scale-110"
                                  title="Ocultar usuario"
                                >
                                  <span className="text-purple-400 text-sm">👁️</span>
                                </button>
                              </>
                            )}

                            {/* Botón de Bloquear/Desbloquear - siempre visible */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('🔒 Click en candado - Usuario:', usuario.username, 'Bloqueado:', usuario.is_blocked);
                                console.log('📊 Estados actuales:', { modalBlockUser, modalUnblockUser });

                                if (usuario.is_blocked) {
                                  console.log('➡️ Abriendo modal de DESBLOQUEO');
                                  // Abrir modal de desbloqueo
                                  setModalUnblockUser({
                                    isOpen: true,
                                    usuario: usuario
                                  });
                                } else {
                                  console.log('➡️ Abriendo modal de BLOQUEO');
                                  // Abrir modal de bloqueo
                                  setModalBlockUser({
                                    isOpen: true,
                                    usuario: usuario
                                  });
                                }
                              }}
                              className={`w-8 h-8 rounded-lg ${usuario.is_blocked
                                ? 'bg-red-600/40 hover:bg-red-600/60 border-red-500/50'
                                : 'bg-red-600/20 hover:bg-red-600/40 border-red-500/30'
                                } border flex items-center justify-center transition-all hover:scale-110`}
                              title={usuario.is_blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                            >
                              <span className="text-red-400 text-sm">{usuario.is_blocked ? '🔒' : '🔓'}</span>
                            </button>
                          </div>

                          {/* Marca de sub-agentes */}
                          {tieneSubAgentesFlag && (
                            <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold ml-2">
                              SUB-AGENTE
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>
                      {busquedaUsuario
                        ? `No se encontraron usuarios con "${busquedaUsuario}"`
                        : agenteSeleccionado
                          ? `${agenteSeleccionado.username} no tiene usuarios en su red`
                          : 'Selecciona un agente del árbol para ver sus usuarios'
                      }
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Gestión de Cartones (Usuario Seleccionado del Árbol) */}
          {usuarioSeleccionado && (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-4 rounded-xl mb-6">
                <h3 className="text-xl font-bold mb-2">
                  🎫 Cartones de {usuarioSeleccionado.username}
                </h3>
                <p className="text-sm text-indigo-200">
                  💰 Saldo: ${Math.floor(usuarioSeleccionado.balance || 0).toLocaleString('es-CO')}
                </p>
              </div>

              <div className="space-y-4">
                {/* Cartones Bronce */}
                <div className="p-4 bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-2 border-orange-500/50 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full shadow-lg"></div>
                      <span className="font-bold text-orange-400">BRONCE</span>
                    </div>
                    <span className="text-2xl font-bold text-orange-300">{cartones.bronce.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'bronce', 1)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                      + Agregar
                    </button>
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'bronce', -1)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                      disabled={cartones.bronce <= 0}
                    >
                      - Quitar
                    </button>
                  </div>
                </div>

                {/* Cartones Plata */}
                <div className="p-4 bg-gradient-to-r from-gray-800/30 to-slate-800/30 border-2 border-gray-400/50 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg"></div>
                      <span className="font-bold text-gray-300">PLATA</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-200">{cartones.plata.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'plata', 1)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                      + Agregar
                    </button>
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'plata', -1)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                      disabled={cartones.plata <= 0}
                    >
                      - Quitar
                    </button>
                  </div>
                </div>

                {/* Cartones Oro */}
                <div className="p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-2 border-yellow-500/50 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg"></div>
                      <span className="font-bold text-yellow-400">ORO</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-300">{cartones.oro.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'oro', 1)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                      + Agregar
                    </button>
                    <button
                      onClick={() => handleCargarCartones(usuarioSeleccionado.id, 'oro', -1)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
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
                  ${Math.floor(modalDinero.saldoActual).toLocaleString('es-CO')}
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
                  className={`flex-1 ${modalDinero.tipo === 'cargar'
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

      {/* Modales renderizados fuera del componente para evitar className="hidden" */}
      {showSuccessPopup && createPortal(
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10001] bg-green-500 text-white px-8 py-6 rounded-lg shadow-2xl animate-bounce">
          <p className="text-2xl font-bold text-center">✅ MOVIMIENTO OK</p>
        </div>,
        document.body
      )}

      {/* Modal de Creación de Usuario - Renderizado con portal */}
      {modalCrearUsuario.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
            {/* Tabs: Jugador / Agente */}
            <div className="grid grid-cols-2">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tipoUsuario: 'jugador' })}
                className={`py-4 font-bold text-white transition-all ${modalCrearUsuario.tipoUsuario === 'jugador'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  : 'bg-gray-700 hover:bg-gray-600'
                  } rounded-tl-xl flex items-center justify-center gap-2`}
              >
                <span>👤</span>
                <span>Jugador</span>
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tipoUsuario: 'agente' })}
                className={`py-4 font-bold text-white transition-all ${modalCrearUsuario.tipoUsuario === 'agente'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
                  } rounded-tr-xl flex items-center justify-center gap-2`}
              >
                <span>🏢</span>
                <span>Agente</span>
              </button>
            </div>

            {/* Tabs: Ingreso / Datos personales */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tabActiva: 'ingreso' })}
                className={`flex-1 py-3 font-semibold transition-all ${modalCrearUsuario.tabActiva === 'ingreso'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
              >
                Ingreso
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tabActiva: 'datos_personales' })}
                className={`flex-1 py-3 font-semibold transition-all ${modalCrearUsuario.tabActiva === 'datos_personales'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
                      className="flex-1 px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-white text-xl">👁️</span>
                      <div className="flex-1 relative">
                        <input
                          type={showPasswordCreate ? "text" : "password"}
                          value={modalCrearUsuario.datosIngreso.password}
                          onChange={(e) => {
                            const pwd = e.target.value;
                            setModalCrearUsuario({
                              ...modalCrearUsuario,
                              datosIngreso: { ...modalCrearUsuario.datosIngreso, password: pwd }
                            });
                            setPasswordStrengthCreate(calculatePasswordStrength(pwd));
                          }}
                          placeholder="Contraseña"
                          className="w-full px-4 py-2 pr-10 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordCreate(!showPasswordCreate)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-indigo-400 transition-colors text-lg"
                        >
                          {showPasswordCreate ? '👁' : '🔒'}
                        </button>
                      </div>
                    </div>
                    {modalCrearUsuario.datosIngreso.password && passwordStrengthCreate.level > 0 && (
                      <div className="ml-11 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrengthCreate.level === 1 ? 'bg-red-500 w-1/3' :
                              passwordStrengthCreate.level === 2 ? 'bg-yellow-500 w-2/3' :
                                'bg-green-500 w-full'
                              }`}
                          ></div>
                        </div>
                        <span className={`text-sm font-semibold ${passwordStrengthCreate.color}`}>
                          {passwordStrengthCreate.text}
                        </span>
                      </div>
                    )}
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
                    className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="text"
                    value={modalCrearUsuario.datosPersonales.documento}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, documento: e.target.value }
                    })}
                    placeholder="Documento (opcional)"
                    className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="email"
                    value={modalCrearUsuario.datosPersonales.email}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, email: e.target.value }
                    })}
                    placeholder="Email (opcional)"
                    className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="tel"
                    value={modalCrearUsuario.datosPersonales.telefono}
                    onChange={(e) => setModalCrearUsuario({
                      ...modalCrearUsuario,
                      datosPersonales: { ...modalCrearUsuario.datosPersonales, telefono: e.target.value }
                    })}
                    placeholder="Teléfono (opcional)"
                    className="w-full px-4 py-2 bg-gray-900/50 border-b-2 border-gray-700 focus:outline-none focus:border-indigo-500 text-white placeholder-gray-500"
                  />
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-4 px-6 pb-6">
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, isOpen: false })}
                className="flex-1 py-3 border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 font-semibold rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleCrearUsuario}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Gestión de Usuario - Renderizado con portal */}
      {modalGestionUsuario.isOpen && modalGestionUsuario.usuario && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {modalGestionUsuario.usuario.role === 'agente' ? '🏢' : '👤'} {modalGestionUsuario.usuario.username}
                  </h2>
                  <p className="text-sm text-purple-200 mt-1">
                    {modalGestionUsuario.usuario.role === 'agente' ? 'Agente' : 'Jugador'} • ID: {modalGestionUsuario.usuario.id}
                  </p>
                </div>
                <button
                  onClick={() => setModalGestionUsuario({ isOpen: false, usuario: null })}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Balance - Solo visible para SuperAdmin */}
              {currentUser.role === 'superadmin' && (
                <div>
                  <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                    💰 Balance
                  </h3>
                  <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/30 border border-green-600/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-green-300 font-semibold">Saldo Actual:</span>
                      <span className="text-white font-bold text-2xl">
                        ${Math.floor(modalGestionUsuario.usuario.balance || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalConfirmacion({
                          isOpen: true,
                          tipo: 'dinero-cargar',
                          sala: '',
                          cantidad: '',
                          userId: modalGestionUsuario.usuario.id
                        })}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        + Cargar
                      </button>
                      <button
                        onClick={() => setModalConfirmacion({
                          isOpen: true,
                          tipo: 'dinero-descargar',
                          sala: '',
                          cantidad: '',
                          userId: modalGestionUsuario.usuario.id
                        })}
                        className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        − Descargar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cartones y Gift Cards en 2 columnas */}
              <div>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  🎫 Cartones
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna 1: Cartones Normales */}
                  <div className="space-y-3">
                    {/* Bronce */}
                    <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                          <span className="text-orange-300 font-semibold">Bronce:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.usuario.cards_bronce || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-agregar',
                            sala: 'bronce',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
                        >
                          + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-quitar',
                            sala: 'bronce',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.usuario.cards_bronce || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div>

                    {/* Plata */}
                    <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/20 border border-gray-500/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                          <span className="text-gray-300 font-semibold">Plata:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.usuario.cards_plata || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-agregar',
                            sala: 'plata',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
                        >
                          + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-quitar',
                            sala: 'plata',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.usuario.cards_plata || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div>

                    {/* Oro */}
                    <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-600/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                          <span className="text-yellow-300 font-semibold">Oro:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.usuario.cards_oro || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-agregar',
                            sala: 'oro',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-all"
                        >
                          + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'cartones-quitar',
                            sala: 'oro',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.usuario.cards_oro || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div>
                  </div> {/* Cierra columna de cartones normales */}

                  {/* Columna 2: Gift Cards - Solo visible para Andy */}
                  {currentUser.role === 'superadmin' && currentUser.username?.toLowerCase() === 'andy' && <div className="space-y-3">
                    <div className="text-pink-300 font-semibold text-sm mb-2 flex items-center gap-2">
                      🎁 Cartones de Regalo
                      <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">Solo Andy</span>
                    </div>

                    {/* Gift Bronce */}
                    <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/30 border-2 border-orange-500/70 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 bg-orange-500/20 px-2 py-1 rounded text-xs text-orange-300 font-bold">
                        REGALO
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full animate-pulse"></div>
                          <span className="text-orange-300 font-semibold">Bronce Regalo:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.giftCards?.bronce || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-agregar',
                            sala: 'bronce',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg"
                        >
                          🎁 + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-quitar',
                            sala: 'bronce',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.giftCards?.bronce || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div>

                    {/* Gift Plata */}
                    <div className="bg-gradient-to-r from-gray-700/40 to-gray-600/30 border-2 border-gray-400/70 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 bg-gray-400/20 px-2 py-1 rounded text-xs text-gray-300 font-bold">
                        REGALO
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 font-semibold">Plata Regalo:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.giftCards?.plata || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-agregar',
                            sala: 'plata',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg"
                        >
                          🎁 + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-quitar',
                            sala: 'plata',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.giftCards?.plata || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div>

                    {/* Gift Oro */}
                    <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-800/30 border-2 border-yellow-500/70 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 bg-yellow-500/20 px-2 py-1 rounded text-xs text-yellow-300 font-bold">
                        REGALO
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full animate-pulse"></div>
                          <span className="text-yellow-300 font-semibold">Oro Regalo:</span>
                        </div>
                        <span className="text-white font-bold text-xl">
                          {(modalGestionUsuario.giftCards?.oro || 0).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-agregar',
                            sala: 'oro',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-lg"
                        >
                          🎁 + Agregar
                        </button>
                        <button
                          onClick={() => setModalConfirmacion({
                            isOpen: true,
                            tipo: 'gift-quitar',
                            sala: 'oro',
                            cantidad: '',
                            userId: modalGestionUsuario.usuario.id,
                            isGift: true
                          })}
                          className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                          disabled={(modalGestionUsuario.giftCards?.oro || 0) === 0}
                        >
                          − Quitar
                        </button>
                      </div>
                    </div> {/* Cierra Gift Oro */}
                  </div>} {/* Cierra <div className="space-y-3"> - columna gift cards */}
                </div> {/* Cierra grid de 2 columnas */}
              </div> {/* Cierra sección de Cartones */}
            </div> {/* Cierra el contenedor del Body */}

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 bg-gray-800/50">
              <button
                onClick={() => setModalGestionUsuario({ isOpen: false, usuario: null })}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CONFIRMACIÓN - Renderizado con portal */}
      {modalConfirmacion.isOpen && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

            {/* Header con color dinámico */}
            <div className={`p-6 ${modalConfirmacion.tipo === 'superadmin-add-balance' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
              modalConfirmacion.tipo === 'superadmin-add-cards' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                modalConfirmacion.tipo === 'dinero-cargar' ? 'bg-gradient-to-r from-green-600 to-emerald-600' :
                  modalConfirmacion.tipo === 'dinero-descargar' ? 'bg-gradient-to-r from-gray-600 to-gray-700' :
                    modalConfirmacion.tipo === 'cartones-agregar' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' :
                      modalConfirmacion.tipo === 'gift-agregar' ? 'bg-gradient-to-r from-pink-600 to-rose-600' :
                        modalConfirmacion.tipo === 'gift-quitar' ? 'bg-gradient-to-r from-gray-600 to-gray-700' :
                          'bg-gradient-to-r from-gray-600 to-gray-700'
              }`}>
              <h3 className="text-2xl font-bold text-white text-center">
                {modalConfirmacion.tipo === 'superadmin-add-balance' && '👑 SUPERADMIN: Agregar Balance'}
                {modalConfirmacion.tipo === 'superadmin-add-cards' && `👑 SUPERADMIN: Agregar Cartones ${modalConfirmacion.sala?.toUpperCase()}`}
                {modalConfirmacion.tipo === 'dinero-cargar' && '💰 Cargar Dinero'}
                {modalConfirmacion.tipo === 'dinero-descargar' && '💸 Descargar Dinero'}
                {modalConfirmacion.tipo === 'cartones-agregar' && `🎫 Agregar Cartones ${modalConfirmacion.sala.toUpperCase()}`}
                {modalConfirmacion.tipo === 'cartones-quitar' && `🗑️ Quitar Cartones ${modalConfirmacion.sala.toUpperCase()}`}
                {modalConfirmacion.tipo === 'gift-agregar' && `🎁 Agregar Cartones de Regalo ${modalConfirmacion.sala.toUpperCase()}`}
                {modalConfirmacion.tipo === 'gift-quitar' && `🗑️ Quitar Cartones de Regalo ${modalConfirmacion.sala.toUpperCase()}`}
              </h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <label className="block text-gray-300 font-semibold mb-3 text-center">
                {modalConfirmacion.tipo === 'superadmin-add-balance' && '💎 Cantidad a agregar (sin límite):'}
                {modalConfirmacion.tipo === 'superadmin-add-cards' && '💎 Cantidad de cartones a agregar (sin límite):'}
                {modalConfirmacion.tipo.includes('dinero') && !modalConfirmacion.tipo.includes('superadmin') && 'Ingrese el monto (solo pesos enteros):'}
                {modalConfirmacion.tipo.includes('cartones') && !modalConfirmacion.tipo.includes('superadmin') && !modalConfirmacion.tipo.includes('gift') && 'Ingrese la cantidad de cartones:'}
                {modalConfirmacion.tipo.includes('gift') && 'Ingrese la cantidad de cartones de regalo:'}
              </label>

              {/* Badge de SuperAdmin */}
              {(modalConfirmacion.tipo === 'superadmin-add-balance' || modalConfirmacion.tipo === 'superadmin-add-cards') && (
                <div className="mb-3 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 text-sm text-center font-bold">
                    ⚡ PRIVILEGIO SUPERADMIN: Sin límites de recursos
                  </p>
                </div>
              )}

              {/* Mostrar recursos disponibles para operaciones de dinero normales */}
              {modalConfirmacion.tipo === 'dinero-cargar' && (
                <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-lg">
                  <p className="text-indigo-300 text-sm text-center">
                    💼 Tus recursos disponibles: <span className="font-bold">${Math.floor((sharedUserData?.balance || currentUser.balance) || 0).toLocaleString('es-CO')}</span>
                  </p>
                </div>
              )}

              {/* Mostrar balance del usuario para descargar */}
              {modalConfirmacion.tipo === 'dinero-descargar' && (() => {
                // Usar datos del modal de gestión en lugar de buscar en array
                const usuario = modalGestionUsuario.usuario;
                const saldoUsuario = usuario ? Math.floor(parseFloat(usuario.balance) || 0) : 0;
                return (
                  <div className="mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <p className="text-gray-300 text-sm text-center">
                      💰 Balance disponible del usuario: <span className="font-bold">${saldoUsuario.toLocaleString('es-CO')}</span>
                    </p>
                  </div>
                );
              })()}

              {/* Mostrar recursos disponibles para agregar cartones */}
              {modalConfirmacion.tipo === 'cartones-agregar' && (() => {
                const cartonesDisponibles = sharedCartonesStock?.[modalConfirmacion.sala] || currentUser[`cards_${modalConfirmacion.sala}`] || 0;
                return (
                  <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-500/50 rounded-lg">
                    <p className="text-indigo-300 text-sm text-center">
                      🎫 Tus cartones {modalConfirmacion.sala} disponibles: <span className="font-bold">{cartonesDisponibles.toLocaleString('es-CO')}</span>
                    </p>
                  </div>
                );
              })()}

              {/* Mostrar cartones del usuario para quitar */}
              {modalConfirmacion.tipo === 'cartones-quitar' && (() => {
                // Usar datos del modal de gestión en lugar de buscar en array
                const usuario = modalGestionUsuario.usuario;
                const cartonesUsuario = usuario ? (usuario[`cards_${modalConfirmacion.sala}`] || 0) : 0;
                return (
                  <div className="mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <p className="text-gray-300 text-sm text-center">
                      🎫 Cartones {modalConfirmacion.sala} del usuario: <span className="font-bold">{cartonesUsuario.toLocaleString('es-CO')}</span>
                    </p>
                  </div>
                );
              })()}

              {/* Mostrar gift cards disponibles para quitar */}
              {modalConfirmacion.tipo === 'gift-quitar' && (() => {
                const giftCardsActuales = modalGestionUsuario.giftCards?.[modalConfirmacion.sala] || 0;
                return (
                  <div className="mb-3 p-3 bg-pink-900/30 border border-pink-600/50 rounded-lg">
                    <p className="text-pink-300 text-sm text-center">
                      🎁 Cartones de regalo disponibles: <span className="font-bold">{giftCardsActuales.toLocaleString('es-CO')}</span>
                    </p>
                  </div>
                );
              })()}

              <input
                type="text"
                value={modalConfirmacion.cantidad ? parseInt(modalConfirmacion.cantidad || '0').toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, ''); // Eliminar todo excepto dígitos
                  setModalConfirmacion({
                    ...modalConfirmacion,
                    cantidad: rawValue // Guardar valor sin formato
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') ejecutarOperacion();
                  if (e.key === 'Escape') setModalConfirmacion({ isOpen: false, tipo: '', sala: '', cantidad: '', userId: null, isProcessing: false, isGift: false });
                  // Bloquear punto y coma
                  if (e.key === '.' || e.key === ',') {
                    e.preventDefault();
                  }
                }}
                placeholder={modalConfirmacion.tipo.includes('dinero') ? '$ 0' : '0'}
                className="w-full bg-gray-700/50 border-2 border-purple-500/30 rounded-xl px-4 py-3 text-white text-center text-xl font-bold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                autoFocus
              />

              <p className="text-gray-400 text-xs text-center mt-2">
                Presiona <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Enter</kbd> para confirmar o <kbd className="px-2 py-0.5 bg-gray-700 rounded border border-gray-600">Esc</kbd> para cancelar
              </p>
            </div>

            {/* Footer con botones */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setModalConfirmacion({ isOpen: false, tipo: '', sala: '', cantidad: '', userId: null, isProcessing: false, isGift: false })}
                className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={ejecutarOperacion}
                disabled={modalConfirmacion.isProcessing}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${modalConfirmacion.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  } ${modalConfirmacion.tipo === 'superadmin-add-balance' || modalConfirmacion.tipo === 'superadmin-add-cards' ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500' :
                    modalConfirmacion.tipo === 'dinero-cargar' ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' :
                      modalConfirmacion.tipo === 'dinero-descargar' ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700' :
                        modalConfirmacion.tipo === 'cartones-agregar' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' :
                          modalConfirmacion.tipo === 'gift-agregar' ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500' :
                            modalConfirmacion.tipo === 'gift-quitar' ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700' :
                              'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                  }`}
              >
                {modalConfirmacion.isProcessing ? '⏳ PROCESANDO...' : '✓ ACEPTAR'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Información del Usuario */}
      {modalInformacion.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Informacion del Usuario</h3>
              <button
                onClick={() => setModalInformacion({ isOpen: false, usuario: null, estructura: [], agentesCount: 0, jugadoresCount: 0, parent: null })}
                className="text-white hover:text-red-300 transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4 text-gray-200">
              {/* ID */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">ID:</span>
                <span className="font-semibold">{modalInformacion.usuario?.id}</span>
              </div>

              {/* Usuario */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Usuario:</span>
                <span className="font-semibold">{modalInformacion.usuario?.username}</span>
              </div>

              {/* Padre */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Padre:</span>
                <span className="font-semibold">
                  {modalInformacion.parent?.username || 'Sin padre'}
                </span>
              </div>

              {/* Rol */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Rol:</span>
                <span className="font-semibold">
                  {modalInformacion.usuario?.role === 'jugador' ? 'Jugador' : 'Agente'}
                </span>
              </div>

              {/* Marca */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Marca:</span>
                <span className="font-semibold">{modalInformacion.usuario?.username}</span>
              </div>

              {/* Agentes */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Agentes:</span>
                <span className="font-semibold text-blue-400">{modalInformacion.agentesCount}</span>
              </div>

              {/* Jugadores */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Jugadores:</span>
                <span className="font-semibold text-green-400">{modalInformacion.jugadoresCount}</span>
              </div>

              {/* Creado */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Creado:</span>
                <span className="font-semibold">
                  {modalInformacion.usuario?.created_at
                    ? new Date(modalInformacion.usuario.created_at).toLocaleString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    : 'No disponible'}
                </span>
              </div>

              {/* Sección Gamificación */}
              {modalInformacion.gamificationStats && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                    🎮 Progreso del Jugador
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                      <p className="text-gray-400">Nivel</p>
                      <p className="text-white font-bold text-lg">⭐ {modalInformacion.gamificationStats.level}</p>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                      <p className="text-gray-400">XP</p>
                      <p className="text-purple-400 font-bold">{modalInformacion.gamificationStats.currentXp}</p>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                      <p className="text-gray-400">Racha Actual</p>
                      <p className="text-orange-400 font-bold">🔥 {modalInformacion.gamificationStats.currentStreak} días</p>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                      <p className="text-gray-400">Logros</p>
                      <p className="text-yellow-400 font-bold">🏅 {modalInformacion.gamificationStats.achievementsCount}</p>
                    </div>
                  </div>
                  {/* Misiones Hoy */}
                  <div className="mt-3 bg-blue-900/20 border border-blue-600/30 p-2 rounded flex justify-between">
                    <span className="text-gray-300">Misiones Hoy:</span>
                    <span className="text-white font-bold">{modalInformacion.gamificationStats.questProgress}</span>
                  </div>

                  {/* Botón Manual Unlock */}
                  <button
                    onClick={() => handleGrantAchievement(modalInformacion.usuario.id, modalInformacion.usuario.username)}
                    className="mt-3 w-full py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold rounded text-sm transition-all shadow-lg"
                  >
                    🏆 Otorgar Logro Manualmente
                  </button>
                </div>
              )}

              {/* Estructura */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <span className="text-gray-400 block mb-2">Estructura:</span>
                <ul className="space-y-1 ml-4">
                  {modalInformacion.estructura.map((username, index) => (
                    <li
                      key={index}
                      className={index === modalInformacion.estructura.length - 1
                        ? 'text-blue-400 font-bold'
                        : 'text-gray-300'}
                    >
                      • {username}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setModalInformacion({ isOpen: false, usuario: null, estructura: [], agentesCount: 0, jugadoresCount: 0, parent: null })}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Cambiar Contraseña */}
      {modalCambiarPassword.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold">🔑 Cambiar Contraseña</h3>
              <button
                onClick={() => {
                  setModalCambiarPassword({
                    isOpen: false,
                    usuario: null,
                    newPassword: '',
                    confirmPassword: '',
                    showPassword: false,
                    isProcessing: false
                  });
                  setPasswordStrengthChange({ level: 0, text: '', color: '' });
                }}
                className="text-white hover:text-red-300 transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Usuario */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                <p className="text-sm text-gray-400">Cambiando contraseña de:</p>
                <p className="text-lg font-bold text-white">{modalCambiarPassword.usuario?.username}</p>
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={modalCambiarPassword.showPassword ? 'text' : 'password'}
                    value={modalCambiarPassword.newPassword}
                    onChange={(e) => {
                      const pwd = e.target.value;
                      setModalCambiarPassword(prev => ({ ...prev, newPassword: pwd }));
                      setPasswordStrengthChange(calculatePasswordStrength(pwd));
                    }}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setModalCambiarPassword(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition-colors"
                  >
                    {modalCambiarPassword.showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {/* Indicador de fortaleza */}
                {modalCambiarPassword.newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrengthChange.level === 1 ? 'bg-red-500 w-1/3' :
                          passwordStrengthChange.level === 2 ? 'bg-yellow-500 w-2/3' :
                            'bg-green-500 w-full'
                          }`}
                      ></div>
                    </div>
                    <span className={`text-sm font-semibold ${passwordStrengthChange.color}`}>
                      {passwordStrengthChange.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type={modalCambiarPassword.showPassword ? 'text' : 'password'}
                  value={modalCambiarPassword.confirmPassword}
                  onChange={(e) => setModalCambiarPassword(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Repetir contraseña"
                />
                {/* Indicador de coincidencia */}
                {modalCambiarPassword.confirmPassword && (
                  <p className={`text-sm mt-2 ${modalCambiarPassword.newPassword === modalCambiarPassword.confirmPassword
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    {modalCambiarPassword.newPassword === modalCambiarPassword.confirmPassword
                      ? '✓ Las contraseñas coinciden'
                      : '✗ Las contraseñas no coinciden'}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setModalCambiarPassword({
                    isOpen: false,
                    usuario: null,
                    newPassword: '',
                    confirmPassword: '',
                    showPassword: false,
                    isProcessing: false
                  });
                  setPasswordStrengthChange({ level: 0, text: '', color: '' });
                }}
                className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleCambiarPassword}
                disabled={modalCambiarPassword.isProcessing}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${modalCambiarPassword.isProcessing
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500'
                  }`}
              >
                {modalCambiarPassword.isProcessing ? '⏳ CAMBIANDO...' : '✓ CAMBIAR CONTRASEÑA'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Modificar Datos Personales */}
      {modalModificar.isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-blue-500/50 w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold">✏️ Modificar Usuario</h3>
              <button
                onClick={() => {
                  setModalModificar({
                    isOpen: false,
                    usuario: null,
                    datosPersonales: {
                      nombre_completo: '',
                      documento: '',
                      email: '',
                      telefono: ''
                    },
                    isProcessing: false
                  });
                }}
                className="text-white hover:text-red-300 transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {/* Usuario */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-400">Modificando datos de:</p>
                <p className="text-lg font-bold text-white">{modalModificar.usuario?.username}</p>
              </div>

              {/* Tab: Datos personales */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={modalModificar.datosPersonales.nombre_completo}
                  onChange={(e) => setModalModificar({
                    ...modalModificar,
                    datosPersonales: { ...modalModificar.datosPersonales, nombre_completo: e.target.value }
                  })}
                  placeholder="Nombre completo (opcional)"
                  className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 rounded-t-lg transition-colors"
                />
                <input
                  type="text"
                  value={modalModificar.datosPersonales.documento}
                  onChange={(e) => setModalModificar({
                    ...modalModificar,
                    datosPersonales: { ...modalModificar.datosPersonales, documento: e.target.value }
                  })}
                  placeholder="Documento (opcional)"
                  className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                />
                <input
                  type="email"
                  value={modalModificar.datosPersonales.email}
                  onChange={(e) => setModalModificar({
                    ...modalModificar,
                    datosPersonales: { ...modalModificar.datosPersonales, email: e.target.value }
                  })}
                  placeholder="Email (opcional)"
                  className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 transition-colors"
                />
                <input
                  type="tel"
                  value={modalModificar.datosPersonales.telefono}
                  onChange={(e) => setModalModificar({
                    ...modalModificar,
                    datosPersonales: { ...modalModificar.datosPersonales, telefono: e.target.value }
                  })}
                  placeholder="Teléfono (opcional)"
                  className="w-full px-4 py-3 bg-gray-700/50 border-b-2 border-gray-600 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400 rounded-b-lg transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setModalModificar({
                    isOpen: false,
                    usuario: null,
                    datosPersonales: {
                      nombre_completo: '',
                      documento: '',
                      email: '',
                      telefono: ''
                    },
                    isProcessing: false
                  });
                }}
                className="flex-1 py-3 border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 font-semibold rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleModificarUsuario}
                disabled={modalModificar.isProcessing}
                className={`flex-1 py-3 text-white font-semibold rounded-xl transition-all ${modalModificar.isProcessing
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                  }`}
              >
                {modalModificar.isProcessing ? '⏳ GUARDANDO...' : 'ACEPTAR'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Popup de Éxito - Elegante con desvanecimiento */}
      {showSuccessPopup && createPortal(
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000] animate-fade-in-down"
          style={{
            animation: 'fadeInDown 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards'
          }}
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-green-300">
            <div className="text-3xl animate-bounce">✅</div>
            <div>
              <p className="font-bold text-lg">{successMessage}</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Popup de Error - Elegante con desvanecimiento */}
      {showErrorPopup && createPortal(
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[10000] animate-fade-in-down"
          style={{
            animation: 'fadeInDown 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards'
          }}
        >
          <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-red-300">
            <div className="text-3xl">❌</div>
            <div>
              <p className="font-bold text-lg">{errorMessage}</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Bloqueo de Usuario */}
      {modalBlockUser.isOpen && (
        <BlockUserModal
          isOpen={modalBlockUser.isOpen}
          user={modalBlockUser.usuario}
          onClose={() => setModalBlockUser({ isOpen: false, usuario: null })}
          onConfirm={handleBlockUser}
        />
      )}

      {/* Modal de Desbloqueo de Usuario */}
      {modalUnblockUser.isOpen && (
        <UnblockUserModal
          isOpen={modalUnblockUser.isOpen}
          user={modalUnblockUser.usuario}
          onClose={() => setModalUnblockUser({ isOpen: false, usuario: null })}
          onConfirm={handleUnblockUser}
        />
      )}

      {/* Modal de Usuario Bloqueado - No puede recibir recursos */}
      {modalUsuarioBloqueado.isOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setModalUsuarioBloqueado({ isOpen: false, usuario: null })}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '28rem',
              width: '100%',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #dc2626 0%, #e11d48 100%)',
                color: 'white',
                padding: '1.5rem',
                borderTopLeftRadius: '1rem',
                borderTopRightRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '2rem' }}>🔒</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Usuario Bloqueado</h2>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.5rem',
                  padding: '1rem'
                }}>
                  <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                    <strong style={{ color: '#f87171' }}>Usuario:</strong>
                  </p>
                  <p style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>
                    {modalUsuarioBloqueado.usuario?.username}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  backgroundColor: 'rgba(251, 146, 60, 0.1)',
                  border: '1px solid rgba(251, 146, 60, 0.3)',
                  borderRadius: '0.5rem',
                  padding: '1rem'
                }}>
                  <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                  <p style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
                    Este usuario se encuentra <strong style={{ color: '#f87171' }}>bloqueado</strong> y no puede recibir recursos.
                  </p>
                </div>
              </div>

              {/* Footer con botón */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalUsuarioBloqueado({ isOpen: false, usuario: null })}
                  style={{
                    background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '0.75rem 2rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    fontSize: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.background = 'linear-gradient(90deg, #1d4ed8 0%, #4338ca 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.background = 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)';
                  }}
                >
                  ENTENDIDO
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}


