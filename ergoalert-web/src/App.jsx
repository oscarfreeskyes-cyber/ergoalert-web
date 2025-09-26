import React, { useCallback, useEffect, useRef, useState } from 'react'
import Paho from "paho-mqtt";

/**
 * ErgoAlert – Prototipo IoT
 */

const DEFAULT_BROKER_URL = 'wss://test.mosquitto.org:8081/mqtt'
const DEFAULT_TOPIC_ALERT = 'ergoalert/trigger'
const DEFAULT_TOPIC_CONFIG = 'ergoalert/config'

export default function App() {
  const [brokerURL, setBrokerURL] = useState(DEFAULT_BROKER_URL)
  const [clientId, setClientId] = useState(() => 'ergoalert-web-' + Math.random().toString(16).slice(2))
  const [topicAlert, setTopicAlert] = useState(DEFAULT_TOPIC_ALERT)
  const [topicConfig, setTopicConfig] = useState(DEFAULT_TOPIC_CONFIG)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Desconectado')
  const [desiredAngle, setDesiredAngle] = useState(20)
  const [postureState, setPostureState] = useState('ok')
  const [lastPayload, setLastPayload] = useState('')
  const [logs, setLogs] = useState([])

  const clientRef = useRef(null)
  const alertRef = useRef(null)

  const appendLog = useCallback((line) => {
    setLogs(prev => [new Date().toLocaleTimeString(), ' ', line, '\n', ...prev].slice(0, 2000))
  }, [])

  const beep = useCallback(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01)
    o.start()
    setTimeout(() => {
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
      o.stop(ctx.currentTime + 0.26)
      ctx.close()
    }, 250)
  }, [])

  const connect = useCallback(() => {
    try {
      const url = new URL(brokerURL)
      const host = url.hostname
      const port = Number(url.port || (url.protocol === 'wss:' ? 443 : 80))
      const path = url.pathname && url.pathname !== '/' ? url.pathname : '/mqtt'

      const client = new Paho.Client(host, port, path, clientId)
      clientRef.current = client

      client.onConnectionLost = (responseObject) => {
        setConnected(false)
        setStatus('Conexión perdida')
        appendLog(`⚠️ Conexión perdida: ${responseObject.errorMessage || ''}`)
      }
      client.onMessageArrived = (message) => {
        const payload = message.payloadString || ''
        setLastPayload(payload)
        appendLog(`📩 ${message.destinationName} → ${payload}`)
        try {
          const data = JSON.parse(payload)
          if (data.alert || data.status === 'bad_posture') {
            setPostureState('alert')
            if (alertRef.current) alertRef.current.style.display = 'block'
            beep()
          } else {
            setPostureState('ok')
            if (alertRef.current) alertRef.current.style.display = 'none'
          }
        } catch {
          if (payload.toUpperCase().includes('ALERT')) {
            setPostureState('alert')
            if (alertRef.current) alertRef.current.style.display = 'block'
            beep()
          }
        }
      }

      setStatus('Conectando…')
      client.connect({
        useSSL: url.protocol === 'wss:',
        timeout: 6,
        onSuccess: () => {
          setConnected(true)
          setStatus('Conectado')
          appendLog(`✅ Conectado a ${brokerURL} como ${clientId}`)
          client.subscribe(topicAlert, { qos: 0 })
          appendLog(`🔔 Suscrito a ${topicAlert}`)
        },
        onFailure: (e) => {
          setConnected(false)
          setStatus('Error al conectar')
          appendLog(`❌ Falló la conexión: ${e.errorMessage || e}`)
        }
      })
    } catch (e) {
      setStatus('Error en URL')
      appendLog('❌ URL inválida del broker: ' + e.message)
    }
  }, [appendLog, beep, brokerURL, clientId, topicAlert])

  const disconnect = useCallback(() => {
    try {
      clientRef.current?.disconnect()
      setConnected(false)
      setStatus('Desconectado')
      appendLog('👋 Desconectado')
    } catch {}
  }, [appendLog])

  const sendConfig = useCallback(() => {
    if (!connected) return
    const msg = new Paho.Message(JSON.stringify({
      device_id: 'demo',
      desired_angle: Number(desiredAngle),
      ts: Date.now()
    }))
    msg.destinationName = topicConfig
    clientRef.current?.send(msg)
    appendLog(`⚙️ Config enviada a ${topicConfig}`)
  }, [appendLog, connected, desiredAngle, topicConfig])

  const sendTestAlert = useCallback(() => {
    if (!connected) return
    const msg = new Paho.Message(JSON.stringify({
      device_id: 'demo',
      status: 'bad_posture',
      alert: true,
      angle: 75,
      ts: Date.now()
    }))
    msg.destinationName = topicAlert
    clientRef.current?.send(msg)
    appendLog(`🚨 Alerta de prueba publicada en ${topicAlert}`)
  }, [appendLog, connected, topicAlert])

  useEffect(() => {
    return () => {
      try { clientRef.current?.disconnect() } catch {}
    }
  }, [])

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h2>ErgoAlert · Prototipo IoT</h2>
          <span className={`badge ${connected ? 'ok' : 'err'}`}>{status}</span>
        </div>

        <div className="grid">
          <div className="row">
            <div>
              <label>Broker WebSocket (WSS)</label>
              <input
                value={brokerURL}
                onChange={(e) => setBrokerURL(e.target.value)}
                placeholder="wss://test.mosquitto.org:8081/mqtt"
              />
            </div>
            <div>
              <label>Client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
          </div>

          <div className="row">
            <div>
              <label>Tópico de alertas</label>
              <input value={topicAlert} onChange={(e) => setTopicAlert(e.target.value)} />
            </div>
            <div>
              <label>Tópico de configuración</label>
              <input value={topicConfig} onChange={(e) => setTopicConfig(e.target.value)} />
            </div>
          </div>

          <div className="row-4">
            <button className="primary" onClick={connect} disabled={connected}>Conectar</button>
            <button className="warning" onClick={disconnect} disabled={!connected}>Desconectar</button>
            <button onClick={sendTestAlert} disabled={!connected}>Publicar alerta de prueba</button>
            <button onClick={sendConfig} disabled={!connected}>Enviar configuración</button>
          </div>

          <div className="row">
            <div>
              <label>Ángulo deseado</label>
              <input type="number" value={desiredAngle} onChange={(e) => setDesiredAngle(e.target.value)} min="0" max="90" />
            </div>
            <div>
              <label>Último mensaje</label>
              <input value={lastPayload} readOnly />
            </div>
          </div>

          <div ref={alertRef} className="alert">
            <strong>¡Mala postura detectada!</strong>
          </div>

          <div>
            <label>Registro</label>
            <pre className="log">{logs.join('')}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
