import React, { useState, useEffect } from "react";
import axios from "axios";
import apiUrl from "../apiConfig";

const EditarJuegoConcurrencia = ({ usuario }) => {
  const [activos, setActivos] = useState([]);
  const [juegos, setJuegos] = useState([]);
  const [juegoSeleccionadoId, setJuegoSeleccionadoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [rating, setRating] = useState("");

  useEffect(() => {
    if (!usuario || !usuario.id) return;

    let isMounted = true;

    // Cargar usuarios activos
    const cargarActivos = () => {
      axios
        .get(`${apiUrl}/api/usuarios/activos`)
        .then((res) => {
          if (isMounted) setActivos(res.data);
        })
        .catch(() => {
          if (isMounted) setActivos([]);
        });
    };

    cargarActivos();
    const activosInterval = setInterval(cargarActivos, 3000);

    // Cargar juegos
    const cargarJuegos = () => {
      axios.get(`${apiUrl}/api/juegos`)
        .then((res) => {
          if (isMounted) setJuegos(res.data.juegos);
        });
    };
    cargarJuegos();

    // Limpieza
    return () => {
      isMounted = false;
      clearInterval(activosInterval);
    };

  }, [usuario]);


  // Al seleccionar un juego del combo box
  const handleSeleccionJuego = async (e) => {
    const id = e.target.value;
    setJuegoSeleccionadoId(id);

    if (id) {
      try {
        const res = await axios.get(`${apiUrl}/api/juegos/${id}`);
        const juego = res.data;
        setNombre(juego.nombre);
        setFecha(juego.fecha_lanzamiento);
        setRating(juego.rating);
      } catch (err) {
        console.error("Error al obtener datos del juego:", err);
        alert("Error al obtener los datos del juego.");
      }
    }
  };

  const handleActualizarJuego = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`${apiUrl}/api/juegos/${juegoSeleccionadoId}`, {
        nombre,
        fecha_lanzamiento: fecha,
        rating: parseFloat(rating),
      }, {
        headers: {
          "X-Usuario-Simulado-Id": usuario.id.toString(), // ✅ importante
        },
      });

      alert("Juego actualizado con éxito");
    } catch (error) {
      console.error("Error actualizando juego:", error);
      alert("Error al actualizar el juego.");
    }
  };

  if (!usuario) {
    return <p className="p-6 text-gray-500">Cargando usuario...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold mb-2">Usuario actual</h2>
      <p className="text-green-800 font-semibold">👤 {usuario.nombre} ({usuario.correo})</p>

      <h2 className="text-xl font-bold mt-6 mb-2">Usuarios en línea</h2>
      <ul className="space-y-2">
        {activos.map((u) => (
          <li key={u.id} className="bg-green-100 p-2 rounded">
            🟢 {u.nombre} ({u.correo})
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">Editar juego</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Selecciona un juego</label>
        <select
          onChange={handleSeleccionJuego}
          value={juegoSeleccionadoId}
          className="border rounded p-2 w-full mb-4"
        >
          <option value="">-- Selecciona un juego --</option>
          {juegos.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nombre} (ID: {j.id})
            </option>
          ))}
        </select>
      </div>

      {juegoSeleccionadoId && (
        <form onSubmit={handleActualizarJuego} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">ID del Juego</label>
            <input
              type="text"
              value={juegoSeleccionadoId}
              disabled
              className="bg-gray-100 border rounded p-2 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Fecha de lanzamiento</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Rating</label>
            <input
              type="number"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="border rounded p-2 w-full"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Actualizar juego
          </button>
        </form>
      )}
    </div>
  );
};

export default EditarJuegoConcurrencia;
