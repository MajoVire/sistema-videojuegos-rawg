import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import apiUrl from "../apiConfig";

const EditarJuegoConcurrencia = ({ usuario }) => {
  const [activos, setActivos] = useState([]);
  const [juegos, setJuegos] = useState([]);
  const [juegoSeleccionadoId, setJuegoSeleccionadoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [rating, setRating] = useState("");

  // 🔓 Liberar juego si se desmonta o cambia selección
  const liberarJuego = useCallback(async () => {
    if (!juegoSeleccionadoId) return;

    try {
      await axios.post(`${apiUrl}/api/juegos/${juegoSeleccionadoId}/liberar`, null, {
        headers: {
          "X-Usuario-Simulado-Id": usuario.id.toString(),
        },
      });
    } catch (err) {
      console.warn("No se pudo liberar el juego:", err);
    }
  }, [juegoSeleccionadoId, usuario?.id]);

  useEffect(() => {
    if (!usuario || !usuario.id) return;

    let isMounted = true;

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

    const cargarJuegos = () => {
      axios.get(`${apiUrl}/api/juegos`).then((res) => {
        if (isMounted) setJuegos(res.data.juegos);
      });
    };

    const pingUsuario = () => {
      if (document.visibilityState !== "visible") return;

      axios
        .post(`${apiUrl}/api/usuarios/ping`, null, {
          headers: {
            "X-Usuario-Simulado-Id": usuario.id.toString(),
          },
        })
        .catch((err) => {
          console.warn("No se pudo enviar ping:", err);
        });
    };

    cargarActivos();
    cargarJuegos();
    pingUsuario();

    const activosInterval = setInterval(cargarActivos, 5000);
    const pingInterval = setInterval(pingUsuario, 5000);

    return () => {
      liberarJuego();
      isMounted = false;
      clearInterval(activosInterval);
      clearInterval(pingInterval);
    };
  }, [usuario, liberarJuego]);

  const handleSeleccionJuego = async (e) => {
    const id = e.target.value;

    if (juegoSeleccionadoId && juegoSeleccionadoId !== id) {
      await liberarJuego();
    }

    setJuegoSeleccionadoId(id);

    if (id) {
      try {
        const bloqueoRes = await axios.post(`${apiUrl}/api/juegos/${id}/bloquear`, null, {
          headers: {
            "X-Usuario-Simulado-Id": usuario.id.toString(),
          },
        });

        const juegoBloqueado = bloqueoRes.data;

        setNombre(juegoBloqueado.nombre);
        setFecha(juegoBloqueado.fecha);
        setRating(juegoBloqueado.rating);
      } catch (err) {
        console.error("Error al bloquear el juego:", err);

        if (err.response?.status === 409) {
          const data = err.response.data;
          alert(
            `⚠️ El juego ya está siendo editado por el usuario ID: ${data.bloqueado_por}\nBloqueo expira a las ${new Date(
              data.bloqueo_expira
            ).toLocaleTimeString()}`
          );
        } else {
          alert("Ocurrió un error inesperado al intentar bloquear el juego.");
        }

        setJuegoSeleccionadoId("");
        setNombre("");
        setFecha("");
        setRating("");
      }
    }
  };

  const handleActualizarJuego = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `${apiUrl}/api/juegos/${juegoSeleccionadoId}`,
        {
          nombre,
          fecha_lanzamiento: fecha,
          rating: parseFloat(rating),
        },
        {
          headers: {
            "X-Usuario-Simulado-Id": usuario.id.toString(),
          },
        }
      );

      alert("Juego actualizado con éxito");

      await liberarJuego();

      setJuegoSeleccionadoId("");
      setNombre("");
      setFecha("");
      setRating("");
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
      <p className="text-green-800 font-semibold">
        👤 {usuario.nombre} ({usuario.correo})
      </p>

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
        <label className="block text-sm font-medium mb-1">
          Selecciona un juego
        </label>
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
