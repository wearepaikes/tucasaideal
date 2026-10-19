# Tu Casa Ideal

Monorepo con la landing migrada a React y una API REST en NestJS con Prisma ORM y MySQL.

## Requisitos

- Node.js 22.18 o superior
- MySQL 8 o compatible

## Puesta en marcha

1. Copiá `.env.example` como `.env` y ajustá `DATABASE_URL`.
2. Instalá dependencias con `npm install`.
3. Creá las tablas con `npm run prisma:migrate -- --name init`.
4. Iniciá ambos proyectos con `npm run dev`.

Frontend: `http://localhost:5173`
API: `http://localhost:3001/api`

## Endpoints

- `GET /api/health`
- `GET /api/models`
- `GET /api/projects`
- `GET /api/works`
- `POST /api/leads`

## Acceso administrativo

El acceso no está enlazado desde la landing. El backend genera una URL permanente
con un token aleatorio que abre el login y el registro en `/acceso/:token`. En la
base solo se guarda su hash SHA-256, por lo que el token original no puede
recuperarse. El acceso puede revocarse desde la base si alguna vez se filtra.

Configurá en `.env` valores aleatorios largos para `JWT_SECRET` y
`ADMIN_LINK_SECRET`. Para crear el enlace permanente:

```bash
curl -X POST http://localhost:3001/api/auth/access-link \
  -H "x-admin-link-secret: TU_ADMIN_LINK_SECRET"
```

El formulario permite registro e inicio de sesión con correo. La primera cuenta
creada recibe el rol `ADMIN`; las siguientes reciben `DIRECTOR`. Las sesiones se
guardan como JWT en una cookie `HttpOnly` de ocho horas.

Para Google OAuth también se requieren `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` y `GOOGLE_CALLBACK_URL`. En Google Cloud, la URI de
redirección autorizada local debe ser:

```text
http://localhost:3001/api/auth/google/callback
```

El formulario intenta guardar cada solicitud en MySQL y mantiene la apertura de WhatsApp como canal principal. Las imágenes existentes se sirven directamente desde `img/` mediante la configuración de Vite para evitar duplicarlas.

## Despliegue

### Railway — backend

Conectá este repositorio y usá `railway.json` desde la raíz. El servicio compila NestJS, ejecuta las migraciones Prisma pendientes y publica `/api/health` como comprobación de estado.

Variables requeridas:

```text
DATABASE_URL
FRONTEND_URL=https://tu-frontend.vercel.app
JWT_SECRET
ADMIN_LINK_SECRET
NODE_ENV=production
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://tu-backend.up.railway.app/api/auth/google/callback
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

`PORT` lo proporciona Railway automáticamente.

### Vercel — frontend

Importá el mismo repositorio dejando la raíz del proyecto en `/`. `vercel.json` compila exclusivamente el workspace `frontend`, publica `frontend/dist` y mantiene las rutas SPA como `/acceso/:token`.

Variable requerida:

```text
VITE_API_URL=https://tu-backend.up.railway.app/api
```
