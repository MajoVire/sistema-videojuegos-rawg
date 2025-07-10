import React, { useState, useEffect } from "react";
import axios from "axios";
import apiUrl from "../apiConfig";

const EditarJuegoConcurrencia = ({ usuario }) => {
  const [activos, setActivos] = useState([]);

  useEffect(() => {
    if (!usuario || !usuario.id) return;

    // Enviar ping cada 5 segundos
    const ping = () => {
      console.log("Enviando ping:", { usuario_id: usuario.id });

      axios.post(
        `${apiUrl}/api/ping`,
        { usuario_id: usuario.id },
        { headers: { "Content-Type": "application/json" } }
      ).catch(console.error);
    };

    ping();
    const pingInterval = setInterval(ping, 5000);

    // Consultar usuarios activos cada 3 segundos
    const cargarActivos = () => {
      axios
        .get(`${apiUrl}/api/usuarios/activos`)
        .then((res) => setActivos(res.data))
        .catch(() => setActivos([]));
    };

    cargarActivos();
    const activosInterval = setInterval(cargarActivos, 3000);

    return () => {
      clearInterval(pingInterval);
      clearInterval(activosInterval);
    };
  }, [usuario?.id]);

  if (!usuario) {
    return <p className="p-6 text-gray-500">Cargando usuario...</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Usuarios en línea</h2>
      <ul className="space-y-2">
        {activos.map((u) => (
          <li key={u.id} className="bg-green-100 p-2 rounded">
            🟢 {u.nombre} ({u.correo})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EditarJuegoConcurrencia;
