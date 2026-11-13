# Desplegar Orquestador en Vercel

Guía paso a paso (se puede hacer desde el teléfono).

---

## 1. Crear el proyecto en Vercel

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión (idealmente con GitHub).
2. Tocá **Add New… → Project**
3. Importá el repositorio `enrrutador/orquestador`
4. Dejá la configuración por defecto (Framework: Next.js)
5. **No despliegues todavía**. Primero configurá las variables de entorno.

---

## 2. Variables de entorno en Vercel

En la pantalla de configuración del proyecto (o después en **Settings → Environment Variables**), agregá estas:

| Nombre | Valor | Ambiente |
|--------|-------|----------|
| `FACEBOOK_CLIENT_ID` | Tu App ID de Meta | Production, Preview |
| `FACEBOOK_CLIENT_SECRET` | Tu App Secret de Meta | Production, Preview |
| `NEXTAUTH_SECRET` | Un string largo y random | Production, Preview |
| `NEXTAUTH_URL` | `https://tu-proyecto.vercel.app` (lo vas a saber después del primer deploy) | Production |

### Cómo generar `NEXTAUTH_SECRET`

Si estás en la computadora:
```bash
openssl rand -base64 32
```

Si estás en el teléfono, podés usar cualquier generador de passwords seguros de ~40 caracteres.

---

## 3. Primer deploy

1. Tocá **Deploy**
2. Esperá a que termine
3. Anotá la URL que te da Vercel (ejemplo: `https://orquestador-xxx.vercel.app`)

---

## 4. Configurar Facebook Login para producción

1. Andá a [developers.facebook.com](https://developers.facebook.com) → tu App
2. **Facebook Login → Settings**
3. En **Valid OAuth Redirect URIs** agregá:
   ```
   https://tu-proyecto.vercel.app/api/auth/callback/facebook
   ```
4. Guardá los cambios

También actualizá `NEXTAUTH_URL` en Vercel con la URL real si hace falta y redesplegá.

---

## 5. Instalar la PWA en Android

1. Abrí la URL de Vercel en **Chrome** del teléfono
2. Menú (⋮) → **Instalar aplicación** / **Agregar a la pantalla de inicio**
3. Listo. Ya la tenés como app.

---

## Notas importantes

- En **modo Desarrollo** de la App de Meta, solo tu cuenta de Facebook puede loguearse.
- Cuando quieras que otras personas la usen, vas a necesitar pasar la App a modo Live + App Review de Meta.
- Cada vez que hagas `git push` a `main`, Vercel redespliega solo.

---

## Checklist rápido

- [ ] Repo importado en Vercel
- [ ] Variables de entorno cargadas
- [ ] Primer deploy hecho
- [ ] Redirect URI de Facebook actualizada con la URL de Vercel
- [ ] Probar login desde el teléfono
- [ ] Instalar como PWA