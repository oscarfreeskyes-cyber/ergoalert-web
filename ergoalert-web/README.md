# ErgoAlert – Prototipo IoT (Web)

Esta es una **aplicación web** mínima para probar un **dispositivo de corrección de postura** usando **MQTT sobre WebSockets**.

## Requisitos
- Node.js LTS (18 o 20)
- NPM (incluido con Node)

## Cómo ejecutar
1) Descomprime este proyecto y entra a la carpeta:
```bash
cd ergoalert-web
```

2) Instala dependencias:
```bash
npm install
```

3) Ejecuta en modo desarrollo:
```bash
npm run dev
```
Abre la URL que te muestre (por ejemplo, http://localhost:5173).

## Uso
- Deja el broker por defecto: `wss://test.mosquitto.org:8081/mqtt`
- Tópicos por defecto:
  - Alertas: `ergoalert/trigger`
  - Configuración: `ergoalert/config`
- Presiona **Conectar**.
- Con **Publicar alerta de prueba** envías un mensaje al tópico de alertas.
- Con **Enviar configuración** publicas `{"desired_angle": <valor>}` al tópico de configuración.

## Formato de mensajes sugerido
- Alerta del dispositivo → `ergoalert/trigger`
```json
{"device_id":"esp32-01","status":"bad_posture","alert":true,"angle":75,"ts":1690000000000}
```

- Configuración enviada desde la app → `ergoalert/config`
```json
{"device_id":"esp32-01","desired_angle":20,"ts":1690000000000}
```

## Notas
- Este broker público es compartido. Usa tópicos únicos para tus pruebas (por ejemplo, `ergoalert/usuarioXYZ/trigger`).
- Para producción usa un broker propio (Mosquitto/EMQX) con autenticación TLS/usuario/contraseña.
