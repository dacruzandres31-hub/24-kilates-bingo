import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

export default function GestionUsuarios({ sharedUserData, sharedCartonesStock, onResourcesUpdate }) {
  const [usuarios, setUsuarios] = useState([]);
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

  useEffect(() => {
    cargarUsuarios();
    
    // Escuchar evento del Dashboard para abrir modal de creación
    const handleOpenCreateModal = (event) => {
      console.log('🟢 GestionUsuarios recibió evento openCreateUserModal:', event.detail);
      abrirModalCrearUsuario(event.detail.role);
    };
    
    // Escuchar evento para abrir modal de gestión desde búsqueda rápida
    const handleOpenManagementModal = (event) => {
      console.log('🟢 GestionUsuarios recibió evento openUserManagementModal:', event.detail);
      const user = event.detail.user;
      // Normalizar balance a número
      const normalizedUser = {
        ...user,
        balance: parseFloat(user.balance) || 0,
        cards_bronce: parseInt(user.cards_bronce) || 0,
        cards_plata: parseInt(user.cards_plata) || 0,
        cards_oro: parseInt(user.cards_oro) || 0
      };
      setModalGestionUsuario({
        isOpen: true,
        usuario: normalizedUser
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
      
      // Normalizar datos: convertir balance a número
      const normalizedUsers = (response.data.all || []).map(user => ({
        ...user,
        balance: parseFloat(user.balance) || 0,
        cards_bronce: parseInt(user.cards_bronce) || 0,
        cards_plata: parseInt(user.cards_plata) || 0,
        cards_oro: parseInt(user.cards_oro) || 0
      }));
      
      setArbolJerarquico(response.data.tree || []);
      setUsuarios(normalizedUsers);
      
      // Guardar información del usuario actual (dueño del panel)
      if (response.data.currentUser) {
        // Buscar el usuario completo con balance en la lista
        const currentUserComplete = normalizedUsers.find(u => u.id === response.data.currentUser.id);
        const updatedUser = {
          ...response.data.currentUser,
          balance: currentUserComplete?.balance || 0,
          cards_bronce: currentUserComplete?.cards_bronce || 0,
          cards_plata: currentUserComplete?.cards_plata || 0,
          cards_oro: currentUserComplete?.cards_oro || 0
        };
        
        setCurrentUser(updatedUser);
        
        // Actualizar recursos compartidos con el Dashboard
        if (onResourcesUpdate) {
          onResourcesUpdate(updatedUser, {
            bronce: updatedUser.cards_bronce || 0,
            plata: updatedUser.cards_plata || 0,
            oro: updatedUser.cards_oro || 0
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
      todosLosUsuarios = usuarios;
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
        // Asignar parent_id del agente seleccionado (o del usuario actual si no hay selección)
        parent_id: agenteSeleccionado?.id || currentUser.id,
        // Datos personales opcionales
        ...(datosPersonales.nombre_completo && { nombre_completo: datosPersonales.nombre_completo }),
        ...(datosPersonales.documento && { documento: datosPersonales.documento }),
        ...(datosPersonales.email && { email: datosPersonales.email }),
        ...(datosPersonales.telefono && { telefono: datosPersonales.telefono })
      };

      const response = await axios.post('/api/admin/users/create', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`✅ ${response.data.message || `${tipoUsuario.toUpperCase()} "${datosIngreso.username}" creado exitosamente`}`);
      
      // Cerrar modal
      setModalCrearUsuario({ ...modalCrearUsuario, isOpen: false });
      
      // Recargar jerarquía completa
      const hierarchyResponse = await axios.get('/api/admin/users/hierarchy', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setArbolJerarquico(hierarchyResponse.data.tree || []);
      setUsuarios(hierarchyResponse.data.all || []);
      
      // Actualizar lista de usuarios del agente seleccionado
      if (agenteSeleccionado) {
        cargarUsuariosDelAgente(agenteSeleccionado.id, hierarchyResponse.data.all || []);
      }
      
      // Expandir nodo del parent donde se creó el usuario
      const parentId = userData.parent_id;
      if (parentId) {
        setNodosExpandidos(prev => new Set([...prev, parentId]));
      }
    } catch (error) {
      alert('❌ Error creando usuario: ' + (error.response?.data?.error || error.message));
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
      
      // CRÍTICO: Actualizar el modal de gestión si está abierto para el mismo usuario
      if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
        const usuarioActualizado = response.data.all.find(u => u.id === userId);
        if (usuarioActualizado) {
          console.log('✅ Modal actualizado - Balance anterior:', modalGestionUsuario.usuario.balance, 'Nuevo balance:', usuarioActualizado.balance);
          setModalGestionUsuario({
            ...modalGestionUsuario,
            usuario: usuarioActualizado // Reemplazar TODO el objeto usuario con datos frescos
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

      // SUPERADMIN: Agregar cartones sin límites
      if (tipo === 'superadmin-add-cards') {
        console.log('💎 Agregando cartones SuperAdmin:', { sala, cantidad: cantidadNum });
        
        await axios.post('/api/admin/users/add-cards', {
          userId: userId,
          room: sala,
          quantity: cantidadNum
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
            bronce: newCurrentUser.cards_bronce || 0,
            plata: newCurrentUser.cards_plata || 0,
            oro: newCurrentUser.cards_oro || 0
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
        
        // CRÍTICO: Actualizar el modal de gestión si está abierto con el usuario completo
        if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
          const usuarioActualizado = response.data.all.find(u => u.id === userId);
          if (usuarioActualizado) {
            console.log('✅ Modal actualizado - Balance anterior:', modalGestionUsuario.usuario.balance, 'Nuevo:', usuarioActualizado.balance);
            setModalGestionUsuario({
              ...modalGestionUsuario,
              usuario: usuarioActualizado // Reemplazar TODO el objeto con datos frescos
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
        
        // Operación de cartones
        const cantidadFinal = (tipo === 'cartones-agregar' ? 1 : -1) * parseInt(cantidad);
        
        await axios.post('/api/admin/users/add-cards', {
          userId: userId,
          room: sala,
          quantity: cantidadFinal
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
        
        // CRÍTICO: Actualizar el modal con el usuario completo
        if (modalGestionUsuario.isOpen && modalGestionUsuario.usuario?.id === userId) {
          const usuarioActualizado = response.data.all.find(u => u.id === userId);
          if (usuarioActualizado) {
            console.log('✅ Modal actualizado - Cartones', sala, ':', usuarioActualizado[`cards_${sala}`]);
            setModalGestionUsuario({
              ...modalGestionUsuario,
              usuario: usuarioActualizado // Reemplazar TODO el objeto
            });
          }
        }
        
        // Actualizar usuarios del agente seleccionado
        if (agenteSeleccionado) {
          cargarUsuariosDelAgente(agenteSeleccionado.id, response.data.all || []);
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
                cards_oro: parseInt(usuarioActualizado.cards_oro) || 0
              };
              setCurrentUser(newCurrentUser);
              onResourcesUpdate(null, {
                bronce: newCurrentUser.cards_bronce,
                plata: newCurrentUser.cards_plata,
                oro: newCurrentUser.cards_oro
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
      console.error('Error en ejecutarOperacion:', error);
      setModalConfirmacion(prev => ({ ...prev, isProcessing: false }));
      alert('❌ ' + (error.response?.data?.error || error.message));
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
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
            esSeleccionado
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
              className="w-5 h-5 flex items-center justify-center hover:bg-gray-600 rounded transition-colors"
            >
              <span className="text-xs">{estaExpandido ? '▼' : '▶'}</span>
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
          )}

          {/* Contenido del nodo */}
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => {
              setAgenteSeleccionado(nodo);
              cargarUsuariosDelAgente(nodo.id, usuarios);
              setUsuarioSeleccionado(null);
            }}
          >
            {/* Icono según rol */}
            <span className="text-xl">{iconoRole}</span>
            
            {/* Nombre */}
            <span className="font-semibold flex-1">{nodo.username}</span>
            
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel Izquierdo: Árbol de Referidos (solo agentes) */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-4 rounded-xl mb-6">
            <h3 className="text-2xl font-bold">🌳 Árbol de Referidos</h3>
            <p className="text-sm text-indigo-200 mt-1">Panel de {currentUser.username || agenteSeleccionado?.username || 'Usuario'}</p>
          </div>

          {/* Botones de creación */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => abrirModalCrearUsuario('jugador')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <span>👤</span>
              <span>Nuevo Jugador</span>
            </button>

            {(currentUser.role === 'superadmin' || currentUser.role === 'agente') && (
              <button
                onClick={() => abrirModalCrearUsuario('agente')}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
              >
                <span>🏢</span>
                <span>Nuevo Agente</span>
              </button>
            )}
          </div>

          {/* Árbol de solo agentes */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
      <div className="space-y-6">
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
            {busquedaUsuario && (
              <p className="text-sm text-gray-400 mt-2">
                Buscando "{busquedaUsuario}" en la red completa de {agenteSeleccionado?.username} • 
                <span className="text-green-400 font-semibold ml-1">
                  {usuariosDelAgente.filter(u => u.username.toLowerCase().includes(busquedaUsuario.toLowerCase())).length} encontrado(s)
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {usuariosDelAgente.filter(u => 
              u.username.toLowerCase().includes(busquedaUsuario.toLowerCase())
            ).length > 0 ? (
              usuariosDelAgente
                .filter(u => u.username.toLowerCase().includes(busquedaUsuario.toLowerCase()))
                .map((usuario) => {
                const esAgente = usuario.role === 'agente';
                const tieneSubAgentesFlag = esAgente && tieneSubAgentes(usuario.id);

                return (
                  <div
                    key={usuario.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                      modalGestionUsuario.usuario?.id === usuario.id
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                        : esAgente 
                          ? 'bg-indigo-900/30 border-indigo-600/50 text-indigo-200 hover:bg-indigo-900/50' 
                          : 'bg-gray-700/30 border-gray-600/50 text-gray-200 hover:bg-gray-700/50'
                    }`}
                    onClick={async () => {
                      // Abrir modal inmediatamente
                      setModalGestionUsuario({
                        isOpen: true,
                        usuario: usuario,
                        giftCards: { bronce: 0, plata: 0, oro: 0 }
                      });
                      
                      // Cargar gift cards en segundo plano
                      try {
                        const giftCards = await cargarGiftCards(usuario.id);
                        setModalGestionUsuario(prev => ({
                          ...prev,
                          giftCards: giftCards
                        }));
                      } catch (error) {
                        console.error('Error cargando gift cards:', error);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{esAgente ? '🏢' : '👤'}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{usuario.username}</p>
                        <p className={`text-xs ${modalGestionUsuario.usuario?.id === usuario.id ? 'text-blue-200' : 'text-gray-400'}`}>
                          {esAgente ? 'Agente' : 'Jugador'} • ID: {usuario.id}
                        </p>
                      </div>
                      
                      {/* Indicadores de recursos */}
                      <div className="flex items-center gap-2">
                        {/* Balance */}
                        <div className="flex items-center gap-1 bg-green-900/30 border border-green-600/40 rounded-lg px-2 py-1">
                          <span className="text-xs text-green-400">💰</span>
                          <span className="text-xs font-semibold text-green-300">
                            ${Math.floor(usuario.balance || 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                        
                        {/* Cartones Bronce */}
                        {(usuario.cards_bronce || 0) > 0 && (
                          <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-600/40 rounded-lg px-2 py-1">
                            <div className="w-2 h-2 bg-gradient-to-br from-orange-500 to-orange-700 rounded-full"></div>
                            <span className="text-xs font-semibold text-orange-300">
                              {usuario.cards_bronce.toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}
                        
                        {/* Cartones Plata */}
                        {(usuario.cards_plata || 0) > 0 && (
                          <div className="flex items-center gap-1 bg-gray-700/30 border border-gray-500/40 rounded-lg px-2 py-1">
                            <div className="w-2 h-2 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-gray-300">
                              {usuario.cards_plata.toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}
                        
                        {/* Cartones Oro */}
                        {(usuario.cards_oro || 0) > 0 && (
                          <div className="flex items-center gap-1 bg-yellow-900/30 border border-yellow-600/40 rounded-lg px-2 py-1">
                            <div className="w-2 h-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
                            <span className="text-xs font-semibold text-yellow-300">
                              {usuario.cards_oro.toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Marca de sub-agentes */}
                      {tieneSubAgentesFlag && (
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                          SUB-AGENTE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-center py-8">
                {busquedaUsuario 
                  ? `No se encontraron usuarios con "${busquedaUsuario}"`
                  : agenteSeleccionado 
                    ? `${agenteSeleccionado.username} no tiene usuarios en su red`
                    : 'Selecciona un agente del árbol para ver sus usuarios'
                }
              </p>
            )}
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
                className={`py-4 font-bold text-white transition-all ${
                  modalCrearUsuario.tipoUsuario === 'jugador' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } rounded-tl-xl flex items-center justify-center gap-2`}
              >
                <span>👤</span>
                <span>Jugador</span>
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tipoUsuario: 'agente' })}
                className={`py-4 font-bold text-white transition-all ${
                  modalCrearUsuario.tipoUsuario === 'agente' 
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
                className={`flex-1 py-3 font-semibold transition-all ${
                  modalCrearUsuario.tabActiva === 'ingreso'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Ingreso
              </button>
              <button
                onClick={() => setModalCrearUsuario({ ...modalCrearUsuario, tabActiva: 'datos_personales' })}
                className={`flex-1 py-3 font-semibold transition-all ${
                  modalCrearUsuario.tabActiva === 'datos_personales'
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
                            className={`h-full transition-all duration-300 ${
                              passwordStrengthCreate.level === 1 ? 'bg-red-500 w-1/3' :
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
            <div className={`p-6 ${
              modalConfirmacion.tipo === 'superadmin-add-balance' ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
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
                const usuario = usuarios.find(u => u.id === modalConfirmacion.userId);
                const saldoUsuario = usuario ? Math.floor(parseFloat(usuario.balance) || 0) : 0;
                return (
                  <div className="mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <p className="text-gray-300 text-sm text-center">
                      💰 Balance disponible del usuario: <span className="font-bold">${saldoUsuario.toLocaleString('es-CO')}</span>
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
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all ${
                  modalConfirmacion.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  modalConfirmacion.tipo === 'superadmin-add-balance' || modalConfirmacion.tipo === 'superadmin-add-cards' ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500' :
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
    </>
  );
}

