import React, { useState, useEffect } from "react";
import axios from "axios";

const ConcurrenciaSimulada = () => {
  // Estados principales
  const [numUsuarios, setNumUsuarios] = useState(5);
  const [operacion, setOperacion] = useState("consulta");
  const [resultados, setResultados] = useState([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [tiempoEjecucion, setTiempoEjecucion] = useState(null);
  const [juegoSeleccionado, setJuegoSeleccionado] = useState(null);
  const [juegosDisponibles, setJuegosDisponibles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  // Configuración de operaciones
  const operacionesDisponibles = [
    { value: "consulta", label: "Consultar juegos" },
    { value: "filtrado", label: "Filtrar juegos" },
    { value: "actualizar", label: "Actualizar rating" },
    { value: "ver_logs", label: "Ver logs recientes" }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const cargarJuegos = async () => {
      try {
        // Cambia esto para obtener solo los primeros 100 juegos (no los 4040)
        const response = await axios.get('/api/juegos/para-actualizar', {
          params: {
            limit: 100,
            page: 1
          }
        });
        setJuegosDisponibles(response.data.juegos);
        if (response.data.juegos.length > 0) {
          setJuegoSeleccionado(response.data.juegos[0].id);
        }
      } catch (error) {
        console.error("Error al cargar juegos:", error);
      }
    };
    cargarJuegos();
  }, []);
    

  // Simular concurrencia
  const simularConcurrencia = async () => {
    if (operacion === "ver_logs") {
      await cargarLogs();
      return;
    }

    setEjecutando(true);
    setResultados([]);
    setTiempoEjecucion(null);
    setLogs([]);
    
    const inicio = performance.now();
    
    try {
      // Crear array de promesas para los usuarios simulados
      const promesas = Array.from({ length: numUsuarios }, (_, i) =>
        realizarOperacionSimulada(i, operacion)
      );

      // Ejecutar todas las operaciones concurrentemente
      const resultados = await Promise.allSettled(promesas);
      
      // Procesar resultados
      const resultadosFormateados = resultados.map((result, i) => {
        if (result.status === "fulfilled") {
          return {
            usuario: `Usuario ${i+1}`,
            estado: 'éxito',
            tiempo: result.value.tiempo,
            datos: result.value.datos,
            operacion: operacion
          };
        } else {
          return {
            usuario: `Usuario ${i+1}`,
            estado: 'fallo',
            error: result.reason.message,
            tiempo: null,
            operacion: operacion
          };
        }
      });

      setResultados(resultadosFormateados);
      
      // Cargar logs después de la simulación
      await cargarLogs();
    } finally {
      setTiempoEjecucion((performance.now() - inicio).toFixed(2));
      setEjecutando(false);
    }
  };

  // Realizar una operación individual
  const realizarOperacionSimulada = async (idUsuario, tipoOperacion) => {
    const inicio = performance.now();
    
    try {
      let response;
      let operacionRealizada = "";
      
      switch(tipoOperacion) {
        case "consulta":
          response = await axios.get('http://localhost:5000/api/juegos');
          operacionRealizada = "Consulta de juegos";
          break;
          
        case "filtrado":
          // Obtener IDs de géneros y plataformas disponibles primero
          const [generosRes, plataformasRes] = await Promise.all([
            axios.get('http://localhost:5000/api/generos'),
            axios.get('http://localhost:5000/api/plataformas')
          ]);
          
          // Seleccionar un género y plataforma aleatorios que existan
          const generoAleatorio = generosRes.data[
            Math.floor(Math.random() * generosRes.data.length)
          ].id;
          
          const plataformaAleatoria = plataformasRes.data[
            Math.floor(Math.random() * plataformasRes.data.length)
          ].id;
          
          response = await axios.get('http://localhost:5000/api/juegos/filtrar', {
            params: {
              genero: generoAleatorio,
              plataforma: plataformaAleatoria,
              page: 1,
              limit: 10
            }
          });
          break;
          
        case "actualizar":
          if (!juegoSeleccionado) {
            // Si no hay juego seleccionado, obtener uno aleatorio
            const juegoRes = await axios.get('/api/juegos/aleatorio');
            setJuegoSeleccionado(juegoRes.data.id);
            response = await actualizarRating(juegoRes.data.id, idUsuario);
          } else {
            response = await actualizarRating(juegoSeleccionado, idUsuario);
          }
          operacionRealizada = "Actualización de rating";
          break;
          
        default:
          throw new Error("Operación no válida");
      }
      
      const tiempo = (performance.now() - inicio).toFixed(2);
      
      return {
        datos: response.data,
        tiempo,
        operacion: operacionRealizada
      };
    } catch (error) {
      console.error(`Error en operación ${tipoOperacion}:`, error);
      throw error;
    }
  };

  const obtenerUsuarioId = async (index) => {
    const correo = `usuario_simulado_${index}@test.com`;
    const res = await axios.get(`/api/usuarios/buscar`, {
      params: { correo }
    });
    return res.data.id;  // Asegúrate que tu backend devuelva { id, nombre, correo }
  };


  // Función auxiliar para actualizar rating
  const actualizarRating = async (juegoId, usuarioIndex) => {
    const nuevoRating = (Math.random() * 4 + 1).toFixed(1);
    const usuarioId = await obtenerUsuarioId(usuarioIndex); // ✅

    return await axios.put(`/api/juegos/${juegoId}/actualizar/concurrente`, {
      rating: nuevoRating
    }, {
      headers: {
        "X-Usuario-Simulado-Id": usuarioId  // así se manda correctamente al backend
      }
    });
  };


  // Cargar logs desde el backend
  const cargarLogs = async () => {
    try {
      const response = await axios.get('/api/logs/recientes', {
        params: { limit: numUsuarios * 2 } // Traer más logs que usuarios
      });
      setLogs(response.data.logs);
    } catch (error) {
      console.error("Error cargando logs:", error);
    }
  };

  // Renderizado
  return (
    <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-indigo-700 border-b pb-2">
        Simulación de Concurrencia con Auditoría
      </h2>
      
      {/* Panel de control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Configuración de usuarios */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usuarios simulados: {numUsuarios}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={numUsuarios}
            onChange={(e) => setNumUsuarios(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={ejecutando}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        
        {/* Selector de operación */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de operación
          </label>
          <select
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={ejecutando}
          >
            {operacionesDisponibles.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
        
        {/* Selector de juego (solo para actualización) */}
        {operacion === "actualizar" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Juego a actualizar
            </label>
            <select
              value={juegoSeleccionado || ''}
              onChange={(e) => setJuegoSeleccionado(parseInt(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={ejecutando}
            >
              {juegosDisponibles.map(juego => (
                <option key={juego.id} value={juego.id}>
                  {juego.nombre} (ID: {juego.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Botón de acción */}
      <div className="flex justify-center mb-8">
        <button
          onClick={simularConcurrencia}
          disabled={ejecutando || (operacion === "actualizar" && !juegoSeleccionado)}
          className={`px-6 py-3 rounded-md text-white font-medium shadow-sm ${
            ejecutando 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {ejecutando ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ejecutando...
            </span>
          ) : (
            'Iniciar Simulación'
          )}
        </button>
      </div>
      
      {/* Resultados y estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Resumen de ejecución */}
        <div className="bg-blue-50 p-4 rounded-lg lg:col-span-1">
          <h3 className="text-lg font-medium text-blue-800 mb-3">Resumen de Ejecución</h3>
          {tiempoEjecucion && (
            <p className="mb-2">
              <span className="font-semibold">Tiempo total:</span> {tiempoEjecucion} ms
            </p>
          )}
          
          {resultados.length > 0 && (
            <>
              <p className="mb-1">
                <span className="font-semibold">Operaciones exitosas:</span> {resultados.filter(r => r.estado === 'éxito').length}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Operaciones fallidas:</span> {resultados.filter(r => r.estado === 'fallo').length}
              </p>
              <p className="mb-1">
                <span className="font-semibold">Tiempo promedio:</span> {(
                  resultados
                    .filter(r => r.tiempo)
                    .reduce((sum, r) => sum + parseFloat(r.tiempo), 0) / 
                  resultados.filter(r => r.tiempo).length || 0
                ).toFixed(2)} ms
              </p>
            </>
          )}
          
          {estadisticas && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Estadísticas del Sistema</h4>
              <p className="mb-1"><span className="font-semibold">Total juegos:</span> {estadisticas.total_juegos}</p>
              <p className="mb-1"><span className="font-semibold">Total actualizaciones:</span> {estadisticas.total_actualizaciones}</p>
              <p className="text-sm text-gray-600">Última actualización: {new Date(estadisticas.ultima_actualizacion).toLocaleString()}</p>
            </div>
          )}
        </div>
        
        {/* Resultados detallados */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {operacion === "ver_logs" ? "Registros de Auditoría" : "Resultados de Simulación"}
          </h3>
          
          <div className="overflow-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {operacion === "ver_logs" ? "Fecha" : "Usuario"}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operación
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(operacion === "ver_logs" ? logs : resultados).map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operacion === "ver_logs" 
                        ? new Date(item.fecha_operacion).toLocaleTimeString() 
                        : item.usuario}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operacion === "ver_logs" 
                        ? `${item.operacion} en ${item.tabla_afectada}` 
                        : item.operacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        (operacion === "ver_logs" || item.estado === 'éxito') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {operacion === "ver_logs" ? "Registrado" : item.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {operacion === "ver_logs" ? (
                        <div className="text-xs">
                          <p><strong>Usuario:</strong> {item.usuario_simulado || 'Sistema'}</p>
                          {item.datos_nuevos && (
                            <p><strong>Cambios:</strong> {JSON.stringify(item.datos_nuevos)}</p>
                          )}
                        </div>
                      ) : (
                        item.estado === 'éxito' ? (
                          item.operacion.includes("Actualización") 
                            ? `Nuevo rating: ${item.datos.rating}` 
                            : `${item.datos.juegos?.length || 0} registros`
                        ) : (
                          <span className="text-red-600 text-xs">{item.error}</span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Nota sobre auditoría */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Sistema de Auditoría Activo</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Todas las operaciones están siendo registradas en la tabla <code>log_operaciones</code> mediante triggers PostgreSQL.
                Los cambios en ratings generan registros de auditoría con los valores anteriores y nuevos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcurrenciaSimulada;