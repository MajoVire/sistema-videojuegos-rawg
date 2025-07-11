import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";
import apiUrl from "../apiConfig";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#fa8072'];

const Consultas = () => {
  const [consultaTipo, setConsultaTipo] = useState("generos"); // "generos", "top3", "top3Opt"
  const [data, setData] = useState([]);
  const [plan, setPlan] = useState([]);
  const [tipoGrafico, setTipoGrafico] = useState("circular");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let endpoint = "";
    if (consultaTipo === "generos") {
      endpoint = "/api/estadisticas/generos";
    } else if (consultaTipo === "top3") {
      endpoint = "/api/estadisticas/top3-genero-funcion";
    } else if (consultaTipo === "top3Opt") {
      endpoint = "/api/estadisticas/top3-genero-funcion-opt";
    }

    fetch(`${apiUrl}${endpoint}`)
      .then(res => res.json())
      .then(res => {
        // Para generos: res.datos y res.plan
        // Para top3: res (array) o res.resultados y res.plan
        if (consultaTipo === "generos") {
          setData(res.datos);
          setPlan(res.plan);
        } else {
          // Si API devuelve array directo
          if (Array.isArray(res)) {
            setData(res);
            setPlan([]);
          } else {
            setData(res.resultados || []);
            setPlan(res.plan || []);
          }
        }
      })
      .catch(() => {
        setData([]);
        setPlan([]);
      })
      .finally(() => setLoading(false));
  }, [consultaTipo]);

  const renderGrafico = () => {
    if (consultaTipo !== "generos") return null;

    if (tipoGrafico === "circular") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="genero"
              cx="50%"
              cy="50%"
              outerRadius={150}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    } else if (tipoGrafico === "barras-vertical") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="genero" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Cantidad de juegos">
              {data.map((entry, index) => (
                <Cell key={`cell-vertical-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (tipoGrafico === "barras-horizontal") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="genero" type="category" />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Cantidad de juegos">
              {data.map((entry, index) => (
                <Cell key={`cell-horizontal-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Consultas Avanzadas</h1>

      <div className="mb-4">
        <p className="font-medium mb-2">Selecciona consulta:</p>
        <label className="mr-6 font-medium cursor-pointer">
          <input
            type="radio"
            value="generos"
            checked={consultaTipo === "generos"}
            onChange={e => setConsultaTipo(e.target.value)}
            className="mr-1"
          />
          Distribución por Género (conteo)
        </label>

        <label className="mr-6 font-medium cursor-pointer">
          <input
            type="radio"
            value="top3"
            checked={consultaTipo === "top3"}
            onChange={e => setConsultaTipo(e.target.value)}
            className="mr-1"
          />
          Top 3 Juegos por Género (Función Original)
        </label>

        <label className="font-medium cursor-pointer">
          <input
            type="radio"
            value="top3Opt"
            checked={consultaTipo === "top3Opt"}
            onChange={e => setConsultaTipo(e.target.value)}
            className="mr-1"
          />
          Top 3 Juegos por Género (Función Optimizada)
        </label>
      </div>

      {consultaTipo === "generos" && (
        <div className="mb-4">
          <p className="font-medium mb-2">Selecciona tipo de gráfico:</p>
          <label className="mr-4 cursor-pointer">
            <input
              type="radio"
              value="circular"
              checked={tipoGrafico === "circular"}
              onChange={e => setTipoGrafico(e.target.value)}
              className="mr-1"
            />
            Circular
          </label>
          <label className="mr-4 cursor-pointer">
            <input
              type="radio"
              value="barras-vertical"
              checked={tipoGrafico === "barras-vertical"}
              onChange={e => setTipoGrafico(e.target.value)}
              className="mr-1"
            />
            Barras Verticales
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              value="barras-horizontal"
              checked={tipoGrafico === "barras-horizontal"}
              onChange={e => setTipoGrafico(e.target.value)}
              className="mr-1"
            />
            Barras Horizontales
          </label>
        </div>
      )}

      {loading && (
        <div className="mb-4 text-center text-blue-600 font-semibold">Cargando datos...</div>
      )}

      {!loading && renderGrafico()}

      {!loading && (consultaTipo === "top3" || consultaTipo === "top3Opt") && (
        <div className="bg-white shadow rounded-xl p-4 mb-6 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Top 3 Juegos por Género</h2>
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 px-3 py-1 text-left">ID</th>
                <th className="border border-gray-300 px-3 py-1 text-left">Nombre</th>
                <th className="border border-gray-300 px-3 py-1 text-left">Rating</th>
                <th className="border border-gray-300 px-3 py-1 text-left">Género</th>
              </tr>
            </thead>
            <tbody>
              {data.map(j => (
                <tr key={j.id}>
                  <td className="border border-gray-300 px-3 py-1">{j.id}</td>
                  <td className="border border-gray-300 px-3 py-1">{j.nombre}</td>
                  <td className="border border-gray-300 px-3 py-1">{j.rating}</td>
                  <td className="border border-gray-300 px-3 py-1">{j.genero}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white shadow rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-4">EXPLAIN ANALYZE (plan de ejecución)</h2>
        <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {plan.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default Consultas;
