import React from "react";
import GameForm from "../components/GameForm";

const InsertarJuego = () => {
  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto mt-6">
      <h2 className="text-2xl font-bold mb-4">Insertar Nuevo Juego</h2>
      <GameForm />
    </div>
  );
};

export default InsertarJuego;
