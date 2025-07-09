import React, { useEffect, useState } from "react";

const UsuarioSelector = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(localStorage.getItem("usuario_simulado") || "");

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/usuarios");
        const data = await res.json();
        setUsuarios(data);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      }
    };

    fetchUsuarios();
  }, []);

  const handleChange = (e) => {
    const valor = e.target.value;
    setSeleccionado(valor);
    localStorage.setItem("usuario_simulado", valor);
  };

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-2 text-sm text-gray-700">
        Selecciona un usuario simulado:
      </label>
      <select
        value={seleccionado}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">-- Selecciona un usuario --</option>
        {usuarios.map((user) => (
          <option key={user.id} value={user.nombre}>
            {user.nombre} ({user.correo})
          </option>
        ))}
      </select>
    </div>
  );
};

export default UsuarioSelector;
