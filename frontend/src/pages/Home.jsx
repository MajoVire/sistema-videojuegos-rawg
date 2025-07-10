import React from "react";
import { Link } from "react-router-dom";
import UsuarioSelector from "../components/UsuarioSelector";

const Home = ({ setUsuarioActual }) => {
  const handleSeleccionUsuario = (usuario) => {
    localStorage.setItem("usuario_simulado", usuario.nombre); // 👈 Guarda nombre limpio
    setUsuarioActual(usuario); // actualiza estado global si es necesario
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center w-96">
        <h1 className="text-2xl font-bold text-purple-700 mb-2">
          Bienvenido a RAWG 🎮
        </h1>

        <p className="mb-6 text-gray-600">
          Explora y administra videojuegos fácilmente.
        </p>

        {/* Selector de usuario simulado */}
        <UsuarioSelector onSelect={handleSeleccionUsuario} />

        <div className="mt-4 flex flex-col gap-2">
          <Link
            to="/insertar"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
          >
            Insertar juegos
          </Link>

          <Link
            to="/editar-concurrencia"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Simular concurrencia
          </Link>
        </div>
      </div>
    </div>
  );
};


export default Home;
