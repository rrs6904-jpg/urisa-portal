import { logoutAction } from '../../lib/auth/actions'

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="mt-3 text-gray-600">Tu cuenta no tiene acceso a esta sección. Contacta al administrador.</p>
        <form action={logoutAction} className="mt-6">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white">Cerrar sesión y volver al ingreso</button>
        </form>
      </section>
    </main>
  )
}
