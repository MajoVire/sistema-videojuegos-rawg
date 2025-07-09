// src/components/SimuladorConcurrencia.jsx
import React from "react";

const SimuladorConcurrencia = () => {
  const usuarios = ["1", "2", "3"]; // IDs de usuarios simulados existentes
  const juegos = [
    { nombre: "Simulación 1", fecha: "2024-01-01", rating: 4.5 },
    { nombre: "Simulación 2", fecha: "2023-12-10", rating: 3.8 },
    { nombre: "Simulación 3", fecha: "2022-07-21", rating: 4.9 }
  ];

  const simularAccesoConcurrente = async () => {
    const peticiones = usuarios.map((usuario, idx) => {
      const juego = juegos[idx];
      const data = {
        ...juego,
        usuario_simulado: usuario
      };

      return fetch("http://localhost:5000/api/juegos/insertar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    });

    try {
      const resultados = await Promise.all(peticiones);
      alert("Simulación de concurrencia completada. Verifica la base de datos y logs.");
    } catch (err) {
      console.error("Error durante concurrencia:", err);
      alert("Error durante simulación concurrente");
    }
  };

  return (
    <div className="my-6">
      <button
        onClick={simularAccesoConcurrente}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        Simular concurrencia (3 usuarios)
      </button>
    </div>
  );
};

export default SimuladorConcurrencia;
