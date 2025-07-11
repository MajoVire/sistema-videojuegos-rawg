import React from "react";
import GameForm from "../components/GameForm";

const InsertarJuego = ({ usuario }) => {
  if (!usuario) {
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando usuario...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto mt-6">
      <p className="text-green-800 font-semibold mb-2">
        👤 {usuario.nombre} ({usuario.correo})
      </p>
      <h2 className="text-2xl font-bold mb-4">Insertar Nuevo Juego</h2>
      <GameForm usuario={usuario} />
    </div>
  );
};


export default InsertarJuego;
