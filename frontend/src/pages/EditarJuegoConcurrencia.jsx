import React, { useState, useEffect } from "react";
import axios from "axios";
import apiUrl from "../apiConfig";

const EditarJuegoConcurrencia = ({ usuario }) => {
  const [activos, setActivos] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      axios
        .get(`${apiUrl}/api/usuarios/activos`)
        .then((res) => setActivos(res.data.activos))
        .catch(() => setActivos(0));
    }, 2000);

    // Consulta inicial inmediata
    axios
      .get(`${apiUrl}/api/usuarios/activos`)
      .then((res) => setActivos(res.data.activos))
      .catch(() => setActivos(0));

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Usuarios activos actualmente</h2>
      <p className="text-4xl font-bold text-green-600">{activos}</p>
    </div>
  );
};

export default EditarJuegoConcurrencia;
