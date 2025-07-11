import React, { useEffect, useState } from "react";
import apiUrl from "../apiConfig";

function LogsViewer() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/logs`)  // Endpoint que devuelve logs
      .then((res) => res.json())
      .then((data) => setLogs(data));
  }, []);

  return (
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Operación</th>
          <th>Tabla</th>
          <th>Usuario</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{log.fecha}</td>
            <td>{log.operacion}</td>
            <td>{log.tabla}</td>
            <td>{log.usuario}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default LogsViewer;
