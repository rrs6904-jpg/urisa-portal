'use client'

import { useState } from 'react'

export default function OperationsIdentityPilot() {
  const [result, setResult] = useState<string>('Sin comprobar')
  const [busy, setBusy] = useState(false)
  async function check() {
    setBusy(true)
    setResult('Comprobando sesión…')
    try {
      const response = await fetch('/api/pilot/operations/me', { credentials: 'same-origin', cache: 'no-store' })
      setResult(JSON.stringify({ status: response.status, ...await response.json() }, null, 2))
    } catch {
      setResult('No se pudo comprobar la sesión.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Operations · piloto de identidad</h1>
      <p className="my-4">Prueba de solo lectura con la sesión del portal. No ejecuta operaciones ni carga asuntos.</p>
      <button onClick={check} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-white">
        {busy ? 'Comprobando…' : 'Comprobar mi acceso'}
      </button>
      <pre className="mt-6 whitespace-pre-wrap">{result}</pre>
    </main>
  )
}
