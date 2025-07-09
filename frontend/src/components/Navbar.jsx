import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md py-4 px-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-indigo-600">Proyecto RAWG</h1>
      <ul className="flex space-x-6 text-gray-700 font-medium">
        <li><Link to="/" className="hover:text-indigo-600">Home</Link></li>
        <li><Link to="/juegos" className="hover:text-indigo-600">Juegos</Link></li>
        <li><Link to="/insertar" className="hover:text-indigo-600">Insertar</Link></li>
        <li><Link to="/auditoria" className="hover:text-indigo-600">Auditoría</Link></li>
        <li><Link to="/consultas" className="hover:text-indigo-600">Consultas</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
