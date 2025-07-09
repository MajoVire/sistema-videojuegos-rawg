from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import psycopg2
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

# -------------------------------
# Configuración inicial
# -------------------------------
load_dotenv()
db_url = os.getenv("DB_URL")
api_key = os.getenv("RAWG_API_KEY")
result = urlparse(db_url)

conn = psycopg2.connect(
    dbname=result.path[1:],
    user=result.username,
    password=result.password,
    host=result.hostname,
    port=result.port
)
conn.autocommit = True
cur = conn.cursor()

# -------------------------------
# Crear la aplicación Flask
# -------------------------------
app = Flask(__name__)
CORS(app)

# -------------------------------
# Rutas del API
# -------------------------------

@app.route("/api/generos", methods=["GET"])
def listar_generos():
    cur = conn.cursor()
    cur.execute("SELECT id, nombre FROM generos ORDER BY nombre;")
    generos = cur.fetchall()
    return jsonify([{"id": g[0], "nombre": g[1]} for g in generos])

@app.route("/api/plataformas", methods=["GET"])
def listar_plataformas():
    cur.execute("SELECT id, nombre FROM plataformas ORDER BY nombre;")
    plataformas = cur.fetchall()
    return jsonify([{"id": p[0], "nombre": p[1]} for p in plataformas])

@app.route("/api/desarrolladores", methods=["GET"])
def listar_desarrolladores():
    q = request.args.get("q", "").lower()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, nombre FROM desarrolladores WHERE LOWER(nombre) LIKE %s ORDER BY nombre LIMIT 20;",
        (f"%{q}%",)
    )
    resultados = cur.fetchall()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in resultados])


@app.route("/api/etiquetas", methods=["GET"])
def listar_etiquetas():
    q = request.args.get("q", "").lower()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, nombre FROM etiquetas WHERE LOWER(nombre) LIKE %s ORDER BY nombre LIMIT 20;",
        (f"%{q}%",)
    )
    resultados = cur.fetchall()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in resultados])



@app.route("/api/juegos", methods=["GET"])
def listar_juegos():
    page = int(request.args.get("page", 1))  # Página actual, por defecto 1
    limit = int(request.args.get("limit", 12))  # Juegos por página
    offset = (page - 1) * limit

    cur.execute("""
        SELECT id, nombre, fecha_lanzamiento, rating
        FROM juegos
        ORDER BY id
        LIMIT %s OFFSET %s;
    """, (limit, offset))
    juegos = cur.fetchall()

    cur.execute("SELECT COUNT(*) FROM juegos;")
    total_juegos = cur.fetchone()[0]

    resultado = {
        "juegos": [
            {
                "id": row[0],
                "nombre": row[1],
                "fecha": row[2],
                "rating": row[3]
            }
            for row in juegos
        ],
        "total": total_juegos
    }
    return jsonify(resultado)

@app.route("/api/juegos/filtrar", methods=["GET"])  
def filtrar_juegos():
    genero = request.args.get("genero")
    plataforma = request.args.get("plataforma")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 12))
    offset = (page - 1) * limit

    # Convertir "" en None para compatibilidad con SQL
    genero = None if genero == "" else genero
    plataforma = None if plataforma == "" else plataforma

    try:
        print("Ejecutando función filtrar_juegos_func...")
        query = """SELECT * FROM filtrar_juegos_func(%s, %s, %s, %s);"""
        cur.execute(query, (genero, plataforma, limit, offset))
        juegos = cur.fetchall()

        print("Ejecutando función contar_juegos_func...")
        count_query = "SELECT contar_juegos_func(%s, %s);"
        cur.execute(count_query, (genero, plataforma))
        total = cur.fetchone()[0]

        resultado = {
            "juegos": [
                {
                    "id": row[0],
                    "nombre": row[1],
                    "fecha": row[2].isoformat() if row[2] else None,
                    "rating": row[3]
                } for row in juegos
            ],
            "total": total
        }

        return jsonify(resultado)

    except Exception as e:
        print("Error en filtrar_juegos:", e)
        return jsonify({"error": "No se pudieron cargar los juegos"}), 500



@app.route("/api/usuarios", methods=["GET"])
def obtener_usuarios_simulados():
    cur.execute("SELECT id, nombre, correo FROM usuarios_simulados")
    usuarios = cur.fetchall()
    resultado = [
        {"id": row[0], "nombre": row[1], "correo": row[2]}
        for row in usuarios
    ]
    return jsonify(resultado)


# Puedes agregar más rutas como:
# - /api/generos
# - /api/juegos/<int:id>
# - /api/juegos/agregar (POST)
# - /api/juegos/eliminar/<id> (DELETE)

# -------------------------------
# Iniciar el servidor
# -------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
