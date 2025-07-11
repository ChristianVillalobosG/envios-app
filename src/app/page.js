'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import RegistroEnvioForm from './components/RegistroEnvioForm'
import TablaEnvios from './components/TablaEnvios'
import LoginForm from './components/LoginForm'
import RegistroForm from './components/RegistroForm'
import Bienvenida from './components/Bienvenida'

export default function Page() {
  const [user, setUser] = useState(null)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [refresh, setRefresh] = useState(false) // Estado para refrescar tabla

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!user) {
    return (
      <main className="p-6">
        {mostrarRegistro ? (
          <RegistroForm
            onRegistroExitoso={() => setMostrarRegistro(false)}
            onMostrarLogin={() => setMostrarRegistro(false)}
          />
        ) : (
          <LoginForm onMostrarRegistro={() => setMostrarRegistro(true)} />
        )}
      </main>
    )
  }

  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Registro de Envíos Pritonic</h1>
        <div>
          {/* Ya no necesitas botón para abrir modal */}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <Bienvenida />

      {/* Formulario fijo debajo del título */}
       <RegistroEnvioForm onSave={() => setRefresh(r => !r)} modo="lineal" /> 

      {/* Tabla de envíos que se refresca cuando cambia 'refresh' */}
      <TablaEnvios refresh={refresh} />
    </main>
  )
}




