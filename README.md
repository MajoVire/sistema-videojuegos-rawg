# 🕹️ Guía de Inicio del Proyecto

---

## 🔧 1. Configuración del Entorno (Frontend)

### 📄 Crear archivo `.env`

Dentro de la carpeta `frontend/src`, crea un archivo llamado `.env` con el siguiente contenido:

```env
REACT_APP_API_URL=http://<TU_IP_LOCAL>:5000
````

Reemplaza `<TU_IP_LOCAL>` con la IP local de tu computadora.

Para obtener tu IP:

En Windows: abre la terminal (**cmd**) y ejecuta:

```bash
ipconfig
```

Busca la dirección **IPv4** (ejemplo: 192.168.1.10).

-----

# 🚀 Iniciar el Frontend

Desde la carpeta `frontend`, ejecuta:

```bash
npm start -- --host 0.0.0.0
```

Esto permite acceder al proyecto desde otros dispositivos de la red local.

-----

# 📦 2. Instalación de Dependencias (Solo la Primera Vez)

## 🔹 Frontend (React)

Desde la carpeta `frontend`:

```bash
npm install
npm install recharts
```

## 🔹 Backend (Python + Flask)

Instala las librerías necesarias:

```bash
pip install flask flask_cors waitress
```

-----

# 🔑 3. Variables de Entorno del Backend

Crea un archivo `.env` dentro de la carpeta `backend` con las claves necesarias para consumir APIs externas. Por ejemplo:

```env
DB_URL=postgresql://postgres._____(Dirección de SupaBase)
RAWG_API_KEY=(API de RAWG)
```

⚠️ **Importante**: No subas este archivo a GitHub. Asegúrate de incluir `.env` en tu archivo `.gitignore`.
