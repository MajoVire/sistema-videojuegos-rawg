from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import psycopg2
import os
from urllib.parse import urlparse
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone


# -------------------------------
# Configuración inicial
# -------------------------------
load_dotenv()
db_url = os.getenv("DB_URL")
api_key = os.getenv("RAWG_API_KEY")
result = urlparse(db_url)



# Función para obtener una conexión nueva por petición
def get_conn():
    return psycopg2.connect(
        dbname=result.path[1:],
        user=result.username,
        password=result.password,
        host=result.hostname,
        port=result.port
    )

# -------------------------------
# Crear la aplicación Flask
# -------------------------------
app = Flask(__name__)
CORS(app)
app.locked_conns = {}

# -------------------------------
# Rutas del API
# -------------------------------


@app.route("/api/generos", methods=["GET"])
def listar_generos():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre FROM generos ORDER BY nombre;")
            generos = cur.fetchall()
    return jsonify([{"id": g[0], "nombre": g[1]} for g in generos])


@app.route("/api/plataformas", methods=["GET"])
def listar_plataformas():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre FROM plataformas ORDER BY nombre;")
            plataformas = cur.fetchall()
    return jsonify([{"id": p[0], "nombre": p[1]} for p in plataformas])


@app.route("/api/desarrolladores", methods=["GET"])
def listar_desarrolladores():
    q = request.args.get("q", "").lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nombre FROM desarrolladores WHERE LOWER(nombre) LIKE %s ORDER BY nombre LIMIT 20;",
                (f"%{q}%",)
            )
            resultados = cur.fetchall()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in resultados])



@app.route("/api/etiquetas", methods=["GET"])
def listar_etiquetas():
    q = request.args.get("q", "").lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
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

    with get_conn() as conn:
        with conn.cursor() as cur:
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
    # Asegura que page nunca sea menor que 1
    page = max(1, int(request.args.get("page", 1)))
    limit = int(request.args.get("limit", 12))
    offset = (page - 1) * limit

    # Convertir "" en None para compatibilidad con SQL
    genero = None if genero == "" else genero
    plataforma = None if plataforma == "" else plataforma

    try:
        print("Ejecutando función filtrar_juegos_func...")
        with get_conn() as conn:
            with conn.cursor() as cur:
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
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nombre, correo FROM usuarios_simulados")
            usuarios = cur.fetchall()
    resultado = [
        {"id": row[0], "nombre": row[1], "correo": row[2]}
        for row in usuarios
    ]
    return jsonify(resultado)

@app.route("/api/juegos/bloquear/<int:juego_id>", methods=["GET"])
def bloquear_juego(juego_id):
    try:
        conn = get_conn()
        conn.autocommit = False  # Activar transacción manual
        cur = conn.cursor()

        # SELECT ... FOR UPDATE bloquea el registro
        cur.execute("SELECT id, nombre, fecha_lanzamiento, rating FROM juegos WHERE id = %s FOR UPDATE;", (juego_id,))
        juego = cur.fetchone()

        if not juego:
            return jsonify({"error": "Juego no encontrado"}), 404

        # Guardar conexión abierta en algún lado, solo para fines de test (no producción)
        app.locked_conns[juego_id] = conn

        return jsonify({
            "id": juego[0],
            "nombre": juego[1],
            "fecha": juego[2],
            "rating": juego[3],
            "mensaje": "Juego bloqueado con SELECT FOR UPDATE"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- heartbeat ----------

@app.route("/api/ping", methods=["POST"])
def ping_usuario():
    data = request.get_json(force=True)  # ✅ fuerza el parseo del JSON
    usuario_id = data.get("usuario_id")

    if not usuario_id:
        return jsonify({"error": "Falta usuario_id"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE usuarios_simulados SET ultima_ping = %s WHERE id = %s",
            (datetime.now(timezone.utc), usuario_id)
        )
        conn.commit()

    return jsonify({"status": "ok"})


@app.route("/api/usuarios/activos", methods=["GET"])
def usuarios_activos():
    ventana = int(request.args.get("ventana", 15))  # segundos
    limite = datetime.now(timezone.utc) - timedelta(seconds=ventana)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, nombre, correo
            FROM usuarios_simulados
            WHERE ultima_ping >= %s
        """, (limite,))
        rows = cur.fetchall()

    activos = [
        {"id": row[0], "nombre": row[1], "correo": row[2]}
        for row in rows
    ]

    return jsonify(activos)
# Puedes agregar más rutas como:
# - /api/generos
# - /api/juegos/<int:id>
# - /api/juegos/agregar (POST)
# - /api/juegos/eliminar/<id> (DELETE)

# -------------------------------
# Iniciar el servidor
# -------------------------------
if __name__ == "__main__":
    # Para concurrencia en Windows, usar waitress
    try:
        from waitress import serve
        print("Iniciando servidor con Waitress en el puerto 5000...")
        serve(app,
          host="0.0.0.0",
          port=5000,
          threads=8,          # más workers
          backlog=128)        # cola de espera más grande
    except ImportError:
        print("Waitress no está instalado. Ejecutando con Flask (solo para desarrollo)")
        app.run(debug=True, port=5000)
