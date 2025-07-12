from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask import current_app
import logging
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
            cur.callproc("obtener_generos")
            generos = cur.fetchall()    
    return jsonify([{"id": g[0], "nombre": g[1]} for g in generos])

@app.route("/api/plataformas", methods=["GET"])
def listar_plataformas():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.callproc("obtener_plataformas")
            plataformas = cur.fetchall()
    return jsonify([{"id": p[0], "nombre": p[1]} for p in plataformas])

@app.route("/api/desarrolladores", methods=["GET"])
def listar_desarrolladores():
    q = request.args.get("q", "").lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.callproc("buscar_desarrolladores", (q,))
            resultados = cur.fetchall()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in resultados])

@app.route("/api/etiquetas", methods=["GET"])
def listar_etiquetas():
    q = request.args.get("q", "").lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.callproc("buscar_etiquetas", (q,))
            resultados = cur.fetchall()
    return jsonify([{"id": r[0], "nombre": r[1]} for r in resultados])

@app.route("/api/juegos", methods=["GET"])
def listar_juegos():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 12))
    offset = (page - 1) * limit

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.callproc("listar_juegos_paginado", (limit, offset))
            juegos = cur.fetchall()

            cur.callproc("contar_juegos")
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
            cur.callproc("obtener_usuarios_simulados")
            usuarios = cur.fetchall()    
    resultado = [
        {"id": row[0], "nombre": row[1], "correo": row[2]}
        for row in usuarios
    ]
    return jsonify(resultado)

@app.route("/api/juegos/<int:juego_id>/bloquear", methods=["POST"])
def bloquear_juego(juego_id):
    usuario_id = request.headers.get("X-Usuario-Simulado-Id")

    if not usuario_id:
        return jsonify({"error": "Falta header de usuario"}), 400

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                ahora = datetime.now(timezone.utc)
                expiracion = ahora + timedelta(minutes=5)  # duración del lock

                # Intenta bloquear si no está bloqueado o si el lock expiró
                cur.execute("""
                    UPDATE juegos
                    SET bloqueado_por = %s,
                        bloqueo_expira = %s
                    WHERE id = %s AND (
                        bloqueado_por IS NULL OR
                        bloqueo_expira < %s OR
                        bloqueado_por = %s
                    )
                    RETURNING id;
                """, (usuario_id, expiracion, juego_id, ahora, usuario_id))

                if cur.fetchone() is None:
                    # Bloqueado por otro usuario
                    cur.execute("""
                        SELECT bloqueado_por, bloqueo_expira FROM juegos WHERE id = %s;
                    """, (juego_id,))
                    row = cur.fetchone()
                    return jsonify({
                        "error": "Juego actualmente en edición por otro usuario",
                        "bloqueado_por": row[0],
                        "bloqueo_expira": row[1].isoformat()
                    }), 409

                # Obtener datos del juego bloqueado
                cur.callproc("obtener_juego_por_id", (juego_id,))
                juego = cur.fetchone()

                return jsonify({
                    "id": juego[0],
                    "nombre": juego[1],
                    "fecha": juego[2],
                    "rating": juego[3],
                    "bloqueado_por": usuario_id,
                    "bloqueo_expira": expiracion.isoformat(),
                    "mensaje": "Juego bloqueado correctamente"
                })

    except Exception as e:
        print("Error al bloquear juego:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/juegos/<int:juego_id>/liberar", methods=["POST"])
def liberar_juego(juego_id):
    usuario_id = request.headers.get("X-Usuario-Simulado-Id")

    if not usuario_id:
        return jsonify({"error": "Falta header de usuario"}), 400

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Solo el que lo bloqueó puede liberarlo
                cur.execute("""
                    UPDATE juegos
                    SET bloqueado_por = NULL,
                        bloqueo_expira = NULL
                    WHERE id = %s AND bloqueado_por = %s;
                """, (juego_id, usuario_id))
                print("Intentando liberar el juego", juego_id, "por usuario", usuario_id, "-> bloqueado_por:", cur.fetchone())

                if cur.rowcount == 0:
                    return jsonify({"error": "No tienes permisos para liberar este juego"}), 403

                return jsonify({"mensaje": "Juego liberado correctamente"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ---------- heartbeat ----------
@app.route("/api/usuarios/activos", methods=["GET"])
def usuarios_activos():
    ventana = int(request.args.get("ventana", 15))  # segundos

    with get_conn() as conn, conn.cursor() as cur:
        cur.callproc("obtener_usuarios_activos", (ventana,))
        rows = cur.fetchall()

    activos = [
        {"id": row[0], "nombre": row[1], "correo": row[2]}
        for row in rows
    ]
    return jsonify(activos)

@app.route("/api/usuarios/ping", methods=["POST"])
def ping_usuario():
    usuario_id = request.headers.get("X-Usuario-Simulado-Id")
    if not usuario_id:
        return jsonify({"error": "Falta el ID del usuario simulado"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT actualizar_ping(%s)", (usuario_id,))
        conn.commit()

    return jsonify({"status": "ok"})

@app.route("/api/juegos/<int:juego_id>", methods=["GET"])
def obtener_juego_por_id(juego_id):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.callproc("obtener_juego_por_id", (juego_id,))
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

@app.route("/api/usuarios/buscar")
def buscar_usuario_por_correo():
    correo = request.args.get("correo")
    with get_conn() as conn, conn.cursor() as cur:
        try:
            cur.callproc("buscar_usuario_por_correo", (correo,))
            user_id = cur.fetchone()[0]
            return jsonify({"id": user_id})
        except Exception as e:
            if 'Usuario no encontrado' in str(e):
                return jsonify({"error": "Usuario no encontrado"}), 404
            return jsonify({"error": str(e)}), 500



@app.route("/api/juegos/insertar", methods=["POST"])
def insertar_juego():
    try:
        
        data = request.get_json(force=True)

        nombre = data.get("nombre")
        fecha = data.get("fecha") or None
        rating = data.get("rating") or None
        generos = data.get("generos", [])
        plataformas = data.get("plataformas", [])
        desarrolladores = data.get("desarrolladores", [])
        etiquetas = data.get("etiquetas", [])
        usuario_simulado_id = request.headers.get("X-Usuario-Simulado-Id")

        if not nombre or not usuario_simulado_id:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        from flask import g
        g.usuario_simulado = usuario_simulado_id
        print("Usuario simulado ID:", g.usuario_simulado)

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SET application_name = %s;", (str(usuario_simulado_id),))


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

@app.route("/api/juegos/<int:juego_id>", methods=["PUT"])
def actualizar_juego_endpoint(juego_id):
    data = request.get_json(force=True)

    nombre = data.get("nombre")
    fecha_lanzamiento = data.get("fecha_lanzamiento")
    rating = data.get("rating")
    usuario_simulado_id = request.headers.get("X-Usuario-Simulado-Id")

    if not all([nombre, fecha_lanzamiento, rating is not None, usuario_simulado_id]):
        return jsonify({"error": "Faltan datos"}), 400

    from flask import g
    g.usuario_simulado = usuario_simulado_id
    print("Usuario simulado:", g.usuario_simulado)

    try:
        conn = get_conn()
        conn.autocommit = False

        with conn.cursor() as cur:
            # Establecer el aplicación_name para identificar al usuario simulado
            cur.execute("SET application_name = %s;", (str(usuario_simulado_id),))
            
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

@app.route("/api/juegos/<int:juego_id>/actualizar/concurrente", methods=["PUT"])
def actualizar_juego_concurrencia(juego_id):
    # Reutiliza la lógica existente del endpoint principal
    return actualizar_juego_endpoint(juego_id)


@app.route("/api/juegos/todos", methods=["GET"])
def obtener_todos_juegos():
    with get_conn() as conn, conn.cursor() as cur:
        cur.callproc("obtener_todos_juegos")
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
