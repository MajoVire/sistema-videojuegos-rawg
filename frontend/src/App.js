import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Juegos from "./pages/Juegos";
import InsertarJuego from "./pages/InsertarJuego";
import Auditoria from "./pages/Auditoria";
import Consultas from "./pages/Consultas";
import EditarJuegoConcurrencia from "./pages/EditarJuegoConcurrencia";

function App() {
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const saved = localStorage.getItem("usuario_simulado");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Valor inválido en localStorage: usuario_simulado. Limpiando...");
      localStorage.removeItem("usuario_simulado");
      return null;
    }
  });


  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home setUsuarioActual={setUsuarioActual} />} />
          <Route path="/juegos" element={<Juegos usuario={usuarioActual} />} />
          <Route path="/insertar" element={<InsertarJuego key={usuarioActual?.id} usuario={usuarioActual} />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/editar-concurrencia" element={<EditarJuegoConcurrencia usuario={usuarioActual} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
