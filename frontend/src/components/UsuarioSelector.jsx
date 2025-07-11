import React, { useEffect, useState } from "react";
import apiUrl from "../apiConfig";

/**
 * Selector de usuarios simulados.
 * @param {Function} onSelect - Callback que recibe el objeto usuario seleccionado.
 */
const UsuarioSelector = ({ onSelect }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(
    localStorage.getItem("usuario_simulado_id") || ""
  );

  // Cargar usuarios al montar
  useEffect(() => {
  const fetchUsuarios = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/usuarios`);
      const data = await res.json();
      setUsuarios(data);

      // Si había un id guardado, establece el usuario actual
      if (data.length && seleccionado) {
        const usr = data.find((u) => u.id === Number(seleccionado));
        if (usr && onSelect) onSelect(usr);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  fetchUsuarios();
}, [onSelect, seleccionado]); 


  const handleChange = (e) => {
    const userId = e.target.value;
    setSeleccionado(userId);
    localStorage.setItem("usuario_simulado_id", userId);

    const usuarioObj = usuarios.find((u) => u.id === Number(userId));
    if (usuarioObj) {
      // Guardar el objeto completo como JSON válido
      localStorage.setItem("usuario_simulado", JSON.stringify(usuarioObj));
      if (onSelect) onSelect(usuarioObj);
    }
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
          <option key={user.id} value={user.id}>
            {user.nombre} ({user.correo})
          </option>
        ))}
      </select>
    </div>
  );
};

export default UsuarioSelector;