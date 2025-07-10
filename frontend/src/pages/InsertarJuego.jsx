import React from "react";
import GameForm from "../components/GameForm";

const InsertarJuego = ({ usuario }) => {
  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto mt-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Insertar Nuevo Juego</h2>
      <h3 className="text-xl font-bold mb-2">Usuario actual</h3>
      {usuario && (  
        <p className="text-green-800 font-semibold">👤 {usuario.nombre} ({usuario.correo})</p>
      )}

      <GameForm usuario={usuario} />
    </div>
  );
};

export default InsertarJuego;
