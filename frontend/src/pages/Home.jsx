// src/pages/Home.jsx
import React from "react";
import UsuarioSelector from "../components/UsuarioSelector";


const Home = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center w-96">
        <h1 className="text-2xl font-bold text-purple-700 mb-2">Bienvenido a RAWG 🎮</h1>
        <p className="mb-6 text-gray-600">
          Explora y administra videojuegos fácilmente.
        </p>

        {/* Selector de usuario simulado */}
        <UsuarioSelector />

        {/* Botón para iniciar */}
        <a
          href="/insertar"
          className="mt-4 inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          Empezar
        </a>
      </div>
    </div>
  );
};

export default Home;
