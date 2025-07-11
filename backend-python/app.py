from flask import Flask, jsonify, request, g
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
    usuario_simulado = getattr(g, "usuario_simulado", "anonimo")

    return psycopg2.connect(
        dbname=result.path[1:],
        user=result.username,
        password=result.password,
        host=result.hostname,
        port=result.port,
        options=f"-c application_name='{usuario_simulado}'"
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

@app.before_request
def asignar_usuario_simulado():
    from flask import g, request
    if request.is_json:
        data = request.get_json(silent=True)
        g.usuario_simulado = data.get("usuario_simulado", "anonimo") if data else "anonimo"
    else:
        g.usuario_simulado = "anonimo"



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

@app.route("/api/juegos/<int:juego_id>", methods=["GET"])
def obtener_juego_por_id(juego_id):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT id, nombre, fecha_lanzamiento, rating
                FROM juegos
                WHERE id = %s;
            """, (juego_id,))
            juego = cur.fetchone()

            if not juego:
                return jsonify({"error": "Juego no encontrado"}), 404

            return jsonify({
                "id": juego[0],
                "nombre": juego[1],
                "fecha_lanzamiento": juego[2].isoformat() if juego[2] else None,
                "rating": juego[3]
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/api/juegos/insertar", methods=["POST"])
def insertar_juego():
    try:
        data = request.get_json(force=True)

        nombre = data.get("nombre")
        fecha = data.get("fecha") or None
        rating = data.get("rating") or None
        usuario_simulado = data.get("usuario_simulado")

        generos = data.get("generos", [])
        plataformas = data.get("plataformas", [])
        desarrolladores = data.get("desarrolladores", [])
        etiquetas = data.get("etiquetas", [])

        if not nombre or not usuario_simulado:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        from flask import g
        g.usuario_simulado = usuario_simulado
        print("Usuario simulado:", g.usuario_simulado)

        # Aquí se abre la conexión
        with get_conn() as conn, conn.cursor() as cur:
            # ⚠️ Forzamos el valor en la sesión PostgreSQL
            cur.execute("SET application_name = %s;", (usuario_simulado,))

            # Insertar juego y relaciones
            cur.execute("SELECT insertar_juego(%s, %s, %s);", (nombre, fecha, rating))
            juego_id = cur.fetchone()[0]

            for id_genero in generos:
                cur.execute("SELECT insertar_juego_genero(%s, %s);", (juego_id, id_genero))
            for id_plataforma in plataformas:
                cur.execute("SELECT insertar_juego_plataforma(%s, %s);", (juego_id, id_plataforma))
            for id_desarrollador in desarrolladores:
                cur.execute("SELECT insertar_juego_desarrollador(%s, %s);", (juego_id, id_desarrollador))
            for id_etiqueta in etiquetas:
                cur.execute("SELECT insertar_juego_etiqueta(%s, %s);", (juego_id, id_etiqueta))

            conn.commit()

        return jsonify({"mensaje": "Juego insertado correctamente", "id": juego_id})

    except Exception as e:
        print("Error al insertar juego:", e)
        return jsonify({"error": str(e)}), 500


from flask import g

from flask import g  # Asegúrate de tener esto arriba

@app.route("/api/juegos/<int:juego_id>", methods=["PUT"])
def actualizar_juego_endpoint(juego_id):
    data = request.get_json(force=True)

    nombre = data.get("nombre")
    fecha_lanzamiento = data.get("fecha_lanzamiento")
    rating = data.get("rating")
    usuario_simulado = data.get("usuario_simulado")

    if not all([nombre, fecha_lanzamiento, rating is not None, usuario_simulado]):
        return jsonify({"error": "Faltan datos"}), 400

    from flask import g
    g.usuario_simulado = usuario_simulado
    print("Usuario simulado:", g.usuario_simulado)

    try:
        conn = get_conn()
        conn.autocommit = False

        with conn.cursor() as cur:
            # Llamar a la función SQL que actualiza el juego
            cur.execute("""
                SELECT actualizar_juego(%s, %s, %s, %s);
            """, (juego_id, nombre, fecha_lanzamiento, rating))

        conn.commit()
        return jsonify({"mensaje": "Juego actualizado con éxito"})

    except Exception as e:
        print("Error al actualizar juego:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()

@app.route("/api/juegos/todos", methods=["GET"])
def obtener_todos_juegos():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, nombre FROM juegos ORDER BY nombre;
        """)
        juegos = cur.fetchall()

    return jsonify([{"id": j[0], "nombre": j[1]} for j in juegos])

@app.route("/api/estadisticas/generos", methods=["GET"])
def estadisticas_por_genero():
    with get_conn() as conn, conn.cursor() as cur:
        # EXPLAIN ANALYZE
        cur.execute("EXPLAIN ANALYZE SELECT * FROM estadisticas_juegos_por_genero();")
        plan = [row[0] for row in cur.fetchall()]

        # Llamar función real
        cur.execute("SELECT * FROM estadisticas_juegos_por_genero();")
        datos = cur.fetchall()

    return jsonify({
        "datos": [{"genero": g, "total": t} for g, t in datos],
        "plan": plan
    })
    
@app.route("/api/estadisticas/top3-genero-funcion", methods=["GET"])
def top3_por_genero_funcion():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("EXPLAIN ANALYZE SELECT * FROM top3_juegos_por_genero();")
        plan = [row[0] for row in cur.fetchall()]

        cur.execute("SELECT * FROM top3_juegos_por_genero();")
        resultados = cur.fetchall()

    return jsonify({
        "resultados": [
            {
                "id": row[0],
                "nombre": row[1],
                "rating": row[2],
                "genero": row[3]
            } for row in resultados
        ],
        "plan": plan
    })
    
@app.route("/api/estadisticas/top3-genero-funcion-opt", methods=["GET"])
def top3_por_genero_funcion_opt():
    with get_conn() as conn, conn.cursor() as cur:
        # Obtener plan EXPLAIN ANALYZE para la función optimizada
        cur.execute("""
            EXPLAIN ANALYZE
            SELECT * FROM top3_juegos_por_genero_optimizado();
        """)
        plan = cur.fetchall()

        # Ejecutar la función optimizada
        cur.execute("SELECT * FROM top3_juegos_por_genero_optimizado();")
        resultados = cur.fetchall()

    # Armar JSON para frontend
    return jsonify({
        "resultados": [
            {
                "id": row[0],
                "nombre": row[1],
                "rating": float(row[2]) if row[2] is not None else None,
                "genero": row[3]
            } for row in resultados
        ],
        "plan": [line[0] for line in plan]
    })
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
