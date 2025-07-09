import requests
import psycopg2
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

# -------------------------------
# Cargar variables de entorno
# -------------------------------
load_dotenv()
db_url = os.getenv("DB_URL")
api_key = os.getenv("RAWG_API_KEY")

# -------------------------------
# Parsear cadena de conexión
# -------------------------------
result = urlparse(db_url)

# -------------------------------
# Conexión a la base de datos
# -------------------------------
conn = psycopg2.connect(
    dbname=result.path[1:],  # Quita la primera barra '/'
    user=result.username,
    password=result.password,
    host=result.hostname,
    port=result.port
)
conn.autocommit = True
cur = conn.cursor()

# -------------------------------
# Funciones para insertar en BD
# -------------------------------

def insertar_genero(nombre):
    cur.execute("SELECT insertar_genero(%s);", (nombre,))
    return cur.fetchone()[0]

def insertar_plataforma(nombre):
    cur.execute("SELECT insertar_plataforma(%s);", (nombre,))
    return cur.fetchone()[0]

def insertar_desarrollador(nombre):
    cur.execute("SELECT insertar_desarrollador(%s);", (nombre,))
    return cur.fetchone()[0]

def insertar_etiqueta(nombre):
    cur.execute("SELECT insertar_etiqueta(%s);", (nombre,))
    return cur.fetchone()[0]

def insertar_juego(nombre, fecha, rating):
    cur.execute("SELECT insertar_juego(%s, %s, %s);", (nombre, fecha, rating))
    return cur.fetchone()[0]

def insertar_juego_genero(id_juego, id_genero):
    cur.execute("SELECT insertar_juego_genero(%s, %s);", (id_juego, id_genero))

def insertar_juego_plataforma(id_juego, id_plataforma):
    cur.execute("SELECT insertar_juego_plataforma(%s, %s);", (id_juego, id_plataforma))

def insertar_juego_desarrollador(id_juego, id_desarrollador):
    cur.execute("SELECT insertar_juego_desarrollador(%s, %s);", (id_juego, id_desarrollador))

def insertar_juego_etiqueta(id_juego, id_etiqueta):
    cur.execute("SELECT insertar_juego_etiqueta(%s, %s);", (id_juego, id_etiqueta))

# -------------------------------
# Función para consumir RAWG API
# -------------------------------

def obtener_juegos_desde_api(url=None, pagina=1):
    if url is None:
        url = "https://api.rawg.io/api/games"
    params = {
        "key": api_key,
        "page": pagina,
        "page_size": 40  # máximo permitido
    }
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"Error al obtener juegos: {response.status_code} - {response.text}")
        return None
    return response.json()

# -------------------------------
# ETL: Extraer de API, cargar en BD
# -------------------------------

def obtener_detalles_juego(juego_id):
    url = f"https://api.rawg.io/api/games/{juego_id}"
    params = {
        "key": api_key
    }
    response = requests.get(url, params=params)
    
    # Verifica si la respuesta fue exitosa
    if response.status_code != 200:
        print(f"Error al obtener detalles del juego ID {juego_id}: {response.status_code} - {response.text}")
        return None
    
    try:
        return response.json()
    except Exception as e:
        print(f"Error al parsear JSON del juego ID {juego_id}: {e}")
        return None




def cargar_juegos():
    url_base = "https://api.rawg.io/api/games"
    pagina = 1
    total_insertados = 0

    while True:
        data = obtener_juegos_desde_api(pagina=pagina)
        if data is None:
            break

        juegos = data.get("results", [])
        if not juegos:
            break

        for juego in juegos:
            nombre = juego["name"]
            fecha = juego.get("released")
            rating = juego.get("rating")

            print(f"Ingresando juego: {nombre}")
            id_juego = insertar_juego(nombre, fecha, rating)
            total_insertados += 1

            # Géneros
            for genero in juego.get("genres", []):
                id_genero = insertar_genero(genero["name"])
                insertar_juego_genero(id_juego, id_genero)

            # Plataformas
            for plataforma_info in juego.get("platforms", []):
                nombre_plataforma = plataforma_info["platform"]["name"]
                id_plataforma = insertar_plataforma(nombre_plataforma)
                insertar_juego_plataforma(id_juego, id_plataforma)

            # Desarrolladores
            detalles = obtener_detalles_juego(juego["id"])
            if detalles and "developers" in detalles:
                for dev in detalles["developers"]:
                    id_dev = insertar_desarrollador(dev["name"])
                    insertar_juego_desarrollador(id_juego, id_dev)

            # Etiquetas
            for etiqueta in juego.get("tags", []):
                id_etiqueta = insertar_etiqueta(etiqueta["name"])
                insertar_juego_etiqueta(id_juego, id_etiqueta)

        # ¿Hay una siguiente página?
        if not data.get("next"):
            break

        pagina += 1

    print(f"Total de juegos insertados: {total_insertados}")

# -------------------------------
# Ejecutar el ETL
# -------------------------------

if __name__ == "__main__":
    cargar_juegos()
    print("Carga completada.")
    cur.close()
    conn.close()
