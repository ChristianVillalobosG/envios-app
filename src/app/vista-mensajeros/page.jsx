'use client'
import TablaMensajeros from '@/app/components/TablaMensajeros'
import { useRouter } from 'next/navigation'

export default function VistaMensajerosPage() {
  const router = useRouter()

  return (
    <div className="p-6">

      {/* Botón volver */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/')}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow"
        >
          ⬅ Volver a tabla principal
        </button>
      </div>

      {/* Tabla */}
      <TablaMensajeros />
    </div>
  )
}
