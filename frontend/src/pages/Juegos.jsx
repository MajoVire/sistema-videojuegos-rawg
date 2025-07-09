import React from 'react';
import Gamelist from '../components/GameList';

const Juegos = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">Lista de Juegos 🎮</h2>
      <Gamelist />
    </div>
  );
};

export default Juegos;
