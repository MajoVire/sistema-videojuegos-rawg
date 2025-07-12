import React, { useEffect, useState } from "react";
import apiUrl from "../apiConfig";

function Gamelist() {
  const [juegos, setJuegos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [genero, setGenero] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [generos, setGeneros] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [plan, setPlan] = useState([]);
  const porPagina = 12;

  // Cargar géneros y plataformas al iniciar
  useEffect(() => {
    fetch(`${apiUrl}/api/generos`)
      .then(res => res.json())
      .then(data => setGeneros(data));

    fetch(`${apiUrl}/api/plataformas`)
      .then(res => res.json())
      .then(data => setPlataformas(data));
  }, []);

  // Cargar juegos
  useEffect(() => {
    let url = `${apiUrl}/api/juegos/filtrar?page=${pagina}&limit=${porPagina}`;
    if (genero) url += `&genero=${encodeURIComponent(genero)}`;
    if (plataforma) url += `&plataforma=${encodeURIComponent(plataforma)}`;

    console.log("Petición a:", url); // 👈 Agrega esto

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setJuegos(data.juegos || []);
        setTotal(data.total || 0);
        setPlan(data.plan || []);
      })
      .catch(error => {
        console.error("Error cargando juegos:", error);
        setJuegos([]);
        setTotal(0);
        setPlan([]);
      });
  }, [pagina, genero, plataforma]);

  const totalPaginas = Math.ceil(total / porPagina);

  return (
    <div className="container mx-auto">

      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        {/* Dropdown de Géneros */}
        <select
          className="border rounded px-3 py-2"
          value={genero}
          onChange={(e) => {
            setGenero(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todos los géneros</option>
          {generos.map((g) => (
            <option key={g.id} value={g.nombre}>{g.nombre}</option>
          ))}


        </select>

        {/* Dropdown de Plataformas */}
        <select
          className="border rounded px-3 py-2"
          value={plataforma}
          onChange={(e) => {
            setPlataforma(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas las plataformas</option>
          {plataformas.map((p) => (
            <option key={p.id} value={p.nombre}>{p.nombre}</option>
          ))}


        </select>
      </div>

      {/* Lista de juegos en grilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
        {juegos.map((juego) => (
          <div key={juego.id} className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{juego.nombre}</h3>
            <p className="text-gray-500 mb-1">
              Lanzamiento: {new Date(juego.fecha).toLocaleDateString()}
            </p>
            <p className="text-gray-600">⭐ {juego.rating}</p>
          </div>
        ))}
      </div>



      {/* Paginación */}
      <div className="flex justify-center mt-6 gap-2">
        <button
          onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
          disabled={pagina === 1}
          className="px-4 py-2 bg-indigo-500 text-white rounded"
        >
          Anterior
        </button>
        <span>Página {pagina} de {totalPaginas}</span>
        <button
          onClick={() => setPagina((prev) => Math.min(prev + 1, totalPaginas))}
          disabled={pagina === totalPaginas}
          className="px-4 py-2 bg-indigo-500 text-white rounded"
        >
          Siguiente
        </button>
      </div>

      {/* EXPLAIN ANALYZE Plan */}
      <div className="bg-white shadow rounded-xl p-4 mt-6">
        <h2 className="text-xl font-semibold mb-4">EXPLAIN ANALYZE (plan de ejecución del filtro)</h2>
        <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {plan.join('\n')}
        </pre>
      </div>
    </div>
  );
}

export default Gamelist;
