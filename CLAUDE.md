# CLAUDE.md — David Artavia Art Ecommerce

## Descripción del proyecto

Sistema web de ecommerce para **David Artavia**, artista costarricense que vende originales, prints, giclées y ofrece comisiones. La página será **bilingüe (español/inglés)** con integración de pagos, carrito, galería, y sistema de contacto para comisiones.

**Estado:** Cliente cerrado. En espera de fotos profesionales para arrancar diseño.

---

## Lo que sabemos del cliente

- **Tipo de obras:** Originales, prints, giclées, murales, comisiones
- **Marca:** Sin identidad visual definida — será creada desde cero
- **Inventario:** Grande y variado
- **Idiomas requeridos:** Español e inglés (bilingüe)
- **Funcionalidad:** 
  - Ecommerce con pagos integrados
  - Galería de obras
  - Sistema de contacto
  - Solicitudes de comisiones

---

## Referencias de diseño

Estilos que le gustan a David:
- https://aaronchang.com/ — premium, lifestyle, ediciones limitadas
- https://tim-packer-fine-arts-store.myshopify.com/ — funcional, educativo
- https://evavolf.com/ — artista independiente, grid de obras, commissions

**Objetivo:** Superar esas 3 referencias en diseño y experiencia.

---

## Infraestructura y Automatización

### n8n Cloud
- **Instancia:** azloomtech.app.n8n.cloud
- **Cuenta:** adriana azofeifa

### Workflow activo: Monitoreo Drive
Workflow automático que monitorea 10 carpetas de David en Google Drive. Cuando sube archivos envía notificaciones:
- Email a `hello@azloom.tech`
- Mensaje Telegram al Chat ID `8978223404`

**Carpetas monitoreadas:**

| Carpeta | Drive ID |
|---|---|
| Biografía y fotos | 1H1BTM-IHoVnyr83pCNKS9IKWyKigSKyQ |
| Comisiones | 1dnsKPNdSTV2lZyPGHtGIUUFDRUTT3LQQ |
| Contrato | 1ShfP6J7iBes6ZwscMGnHzuQcGNu16tJQ |
| Galería de obras | 1XZS-EuyoSb_FDNrxfhIMq9PBckIbm1QD |
| Giclée | 1RypmGLglYkeJT8zdvVATDPR0ZnNt8ngT |
| Logo | 1e4CR53HCYiCVBG-zdQiTFdMP0UxOdXPy |
| Murales | 19bAWk9P5P5vN3D727F_ddjckXrNzuurP |
| Obras más vendidas | 1FxoYfjXSPgkA1eSaUtr5fFzlG8iCxaxF |
| Obras top | 18Vqf3xFrKkfuX7f5FlOJkAKJOTRnfj0G |
| Prints en formato | 18volfB2s7S38rX4r2BOX1j__xzJVxMlu |

**Carpeta raíz:** `1U4omCLLCD0h2OymbEo7X7K4FiA_m3MN7`

### Telegram Bot
- Token guardado en n8n como HTTP Request directo (sin nodo oficial para evitar branding)
- Chat ID: `8978223404`

---

## Archivos del proyecto

- `cuestionario-david-artavia.html` — Formulario de diagnóstico (20 preguntas). Webhook apunta a n8n production.
- `n8n-workflow-david-artavia-drive-notify.json` — Workflow activo de monitoreo Drive.
- `n8n-workflow-david-artavia.json` — Workflow del cuestionario inicial (ya completado con cliente).
- `preguntas-reunion-david.html` — Guía de preguntas para reunión de discovery (ya usada).

---

## Próximos pasos

1. **Notificación automática:** Cuando David suba fotos, recibirás email + Telegram
2. **Análisis visual:** Revisar estilo de las obras para definir identidad
3. **Marca:** Crear logo, paleta de colores, tipografía
4. **Diseño web:** Estructura y mockups
5. **Desarrollo:** HTML/CSS/JS, bilingüe, ecommerce con pagos, galería, contacto

---

## Notas técnicas

- Mantener la página **responsive y accesible**
- Integración de pagos (ej. Stripe, PayPal)
- Sistema de imágenes optimizado para galería de alta resolución
- Selector de idioma (español/inglés) visible en la navegación principal
- Formulario de contacto para comisiones integrado
