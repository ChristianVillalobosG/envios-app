'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Pencil, Trash2, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import RegistroEnvioForm from './RegistroEnvioForm'
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

/* ---------- Modal ---------- */
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
        <div
          className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-300"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex justify-between items-center p-4 border-b border-gray-300">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-gray-600 hover:text-gray-900 text-3xl font-bold leading-none transition-colors"
            >
              ×
            </button>
          </header>
          <section className="p-6">{children}</section>
        </div>
      </div>
    </>
  )
}

/* ---------- Loader ---------- */
const TableBarLoader = () => (
  <div className="flex flex-col gap-2 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 animate-[shimmer_1.5s_infinite]"
          style={{ backgroundSize: '200% 100%', animationDelay: `${i * 0.15}s` }}
        />
      </div>
    ))}
    <style jsx>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
)

/* ---------- TablaEnvios ---------- */
export default function TablaEnvios() {
  const [envios, setEnvios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [mensajeroFiltro, setMensajeroFiltro] = useState('')
  const [actualizados, setActualizados] = useState({})
  const [envioEditando, setEnvioEditando] = useState(null)
  const [originalDelModal, setOriginalDelModal] = useState(null) // copia original para comparar
  const [editandoDesdeModal, setEditandoDesdeModal] = useState(false)  
   const [animacionesListas, setAnimacionesListas] = useState(false); 
  const [loading, setLoading] = useState(true)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)
  const ITEMS_POR_PAGINA = 45
  const [modalOpen, setModalOpen] = useState(false)  

  const abrirCrearEnvio = () => {
  setEnvioEditando(null);
  setOriginalDelModal(null);
  setEditandoDesdeModal(false);
  setModalOpen(true);
};


    useEffect(() => {
    // Evita que las animaciones se activen en el primer render
    const timer = setTimeout(() => setAnimacionesListas(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const fetchEnvios = async (showLoader = false) => {
  if (showLoader) setLoading(true);

  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .order('id', { ascending: false });

   if (!error) {
  setEnvios(data);

  setActualizados(prev => {
    const nuevo = { ...prev };
    data.forEach(e => {
      if (e.actualizado) nuevo[e.id] = true;  // activar si en BD está activo
      // ❗ si prev[e.id] está en true, NO lo apagamos aquí
    });
    return nuevo;
  });
}

  

  if (showLoader)
    setTimeout(() => { 
      setLoading(false); 
      setIsFirstLoad(false); 
    }, 600);
};


  useEffect(() => {
    fetchEnvios(true)
    const canal = supabase
      .channel('envios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envios' }, fetchEnvios)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [])

  /* ---------- Filtrado ---------- */
  const enviosFiltradosOrdenados = useMemo(() => {
    let datos = [...envios]

    if (busqueda.trim()) {
      const f = busqueda.toLowerCase()
      datos = datos.filter(e =>
        Object.values(e).some(v => String(v).toLowerCase().includes(f))
      )
    }

    if (fechaFiltro) datos = datos.filter(e => e.fecha === fechaFiltro)
    if (mensajeroFiltro) datos = datos.filter(e => e.mensajero === mensajeroFiltro)
    if (estadoFiltro) {
      const normalizar = (txt) =>
        txt.toLowerCase()
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "") // elimina tildes
           .trim()

      const estadoNorm = normalizar(estadoFiltro)

      datos = datos.filter(e => normalizar(e.estado || "") === estadoNorm)
    }

    datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    return datos
  }, [envios, busqueda, fechaFiltro, estadoFiltro, mensajeroFiltro])

  const totalPaginas = Math.ceil(enviosFiltradosOrdenados.length / ITEMS_POR_PAGINA)
  const enviosPagina = enviosFiltradosOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  useEffect(() => { setPaginaActual(1) }, [busqueda, fechaFiltro, estadoFiltro, mensajeroFiltro])

  /* ---------- Cambiar Estado (desde tabla) - NO debe activar la animación del modal ---------- */
  const cambiarEstado = async (id, nuevoEstado) => {
    // indicar que este cambio NO viene del modal
    setEditandoDesdeModal(false)

    const hoy = dayjs().format("YYYY-MM-DD")
    const manana = dayjs().add(1, "day").format("YYYY-MM-DD")
    const nuevaFecha = nuevoEstado === "Mañana" ? manana : hoy

    await supabase.from('envios').update({ estado: nuevoEstado, fecha: nuevaFecha }).eq('id', id)

    // No marcar en 'actualizados' (solo las ediciones desde el modal deberían marcar)
    // setActualizados(prev => ({ ...prev, [id]: true }));

    setEnvios(prev =>
      prev.map(e =>
        e.id === id ? { ...e, estado: nuevoEstado, fecha: nuevaFecha } : e
      )
    )
  }

  /* ---------- Cambiar Mensajero (desde tabla) - NO debe activar la animación del modal ---------- */
  const cambiarMensajero = async (id, nuevoMensajero) => {
    // indicar que este cambio NO viene del modal
    setEditandoDesdeModal(false)

    await supabase.from('envios').update({ mensajero: nuevoMensajero }).eq('id', id)
    setEnvios(prev => prev.map(e => e.id === id ? { ...e, mensajero: nuevoMensajero } : e))
    // No marcar en 'actualizados'
    // setActualizados(prev => ({ ...prev, [id]: true }));
  }

  /* ---------- Eliminar ---------- */
  const eliminarEnvio = (id) => {
    toast.warning('¿Eliminar envío?', {
      action: {
        label: 'Sí',
        onClick: async () => {
          await supabase.from('envios').delete().eq('id', id)
          setEnvios(prev => prev.filter(e => e.id !== id))
          toast.success('Eliminado')
        }
      },
      cancel: { label: 'Cancelar' }
    })
  }

  /* ---------- Copiar individual ---------- */
  const copiarEnvio = async (e) => {
    const msg = `
📦 *Envío Mensajero* *${e.mensajero || '-'}*

*${e.cliente || '-'}*
Provincia: ${e.provincia || '-'}
Teléfono: ${e.telefono || '-'}
Ubicación: ${e.ubicacion || '-'}
Notas: *${e.notas || '-'}*
    `.trim()

    await navigator.clipboard.writeText(msg)
    toast.success("✔ Envío copiado")
  }

  /* ---------- Copiar filtrados ---------- */
  const copiarEnviosFiltrados = async () => {
    if (!mensajeroFiltro || enviosFiltradosOrdenados.length === 0) {
      toast.error("Debe seleccionar un mensajero y tener envíos filtrados")
      return
    }

    let msg = `📦 *Envíos Mensajero* *${mensajeroFiltro}*\n\n`

    enviosFiltradosOrdenados.forEach((e, i) => {
      msg += `${i + 1}. *${e.cliente || '-'}*
Provincia: ${e.provincia || '-'}
Teléfono: ${e.telefono || '-'}
Ubicación: ${e.ubicacion || '-'}
Notas: *${e.notas || '-'}*\n\n`
    })

    await navigator.clipboard.writeText(msg.trim())
    toast.success("✔ Envíos copiados")
  }

  /* ---------- Toggle completado ---------- */
  const toggleCompletado = async (id, estadoActual) => {
    const nuevo = !estadoActual

    await supabase.from("envios").update({ completado: nuevo }).eq("id", id)

    setEnvios(prev =>
      prev.map(e => e.id === id ? { ...e, completado: nuevo } : e)
    )

    if (nuevo) toast.success("✔ Envío empacado")
    else toast.error("❗ Envío sin empacar")
  }

  /* ---------- Fecha ---------- */
  const formatearFecha = (fecha) => {
    const d = dayjs(fecha)
    const hoy = dayjs()
    const manana = dayjs().add(1, "day")
    const ayer = dayjs().subtract(1, "day")


    if (d.isSame(hoy, "day")) return "Hoy"
    if (d.isSame(manana, "day")) return "Mañana"
    if (d.isSame(ayer, "day")) return "Ayer"

    return d.format("DD/MM/YYYY")
  } 





 /* ---------- Modal ---------- */
const abrirEditarEnvio = (envio) => {
  // Guardamos el registro original ANTES de modificarlo
  setOriginalDelModal(envio ? { ...envio } : null);
  setEditandoDesdeModal(!!envio); // solo TRUE si viene un envio existente
  setEnvioEditando(envio);
  setModalOpen(true);
};

const cerrarModal = () => {
  setModalOpen(false);
  setEnvioEditando(null);
  setOriginalDelModal(null);
  setEditandoDesdeModal(false);
};

const guardarEnvio = async () => {
  // 🚫 Si es creación — NO animación, solo limpiar y salir
  if (!editandoDesdeModal || !envioEditando?.id || !originalDelModal) {
    setEditandoDesdeModal(false);
    setOriginalDelModal(null);
    await fetchEnvios(); // refresca sin activar animación
    return;
  }

  // Si llega aquí sí es edición REAL → revisamos cambios
  const id = envioEditando.id;

  const { data: actualizadoEnDB, error } = await supabase
    .from("envios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching updated record:", error);
    await fetchEnvios();
    setEditandoDesdeModal(false);
    setOriginalDelModal(null);
    return;
  }

  const camposIgnorados = ["estado", "mensajero"];
  let huboCambiosEspeciales = false;

  const keys = new Set([
    ...Object.keys(originalDelModal),
    ...Object.keys(actualizadoEnDB)
  ]);

  for (const k of keys) {
    if (camposIgnorados.includes(k)) continue;

    const antes = originalDelModal[k] ?? "";
    const ahora = actualizadoEnDB[k] ?? "";

    if (String(antes) !== String(ahora)) {
      huboCambiosEspeciales = true;
      break;
    }
  }

  if (huboCambiosEspeciales) {
    await supabase
      .from("envios")
      .update({ actualizado: true })
      .eq("id", id);

    setActualizados(prev => ({
      ...prev,
      [id]: true
    }));

    setTimeout(async () => {
      await supabase
        .from("envios")
        .update({ actualizado: false })
        .eq("id", id);

      setActualizados(prev => {
        const nuevo = { ...prev };
        delete nuevo[id];
        return nuevo;
      });
    }, 600000);
  }

  await fetchEnvios();

  setEditandoDesdeModal(false);
  setOriginalDelModal(null);
};

  /* ---------- Render ---------- */

  if (loading && isFirstLoad) return <TableBarLoader />
  

  const exportarExcel = (soloFiltrados) => {
    const datos = soloFiltrados ? enviosFiltradosOrdenados : envios;

    if (!datos || datos.length === 0) {
      toast.error("No hay envíos para exportar");
      return;
    }

    // Eliminamos campos innecesarios o internos
    const datosLimpios = datos.map(e => ({
      Cliente: e.cliente || "",
      Provincia: e.provincia || "",
      Teléfono: e.telefono || "",
      Ubicación: e.ubicacion || "",
      Descripción: e.descripcion || "",
      Notas: e.notas || "",
      Mensajero: e.mensajero || "",
      Estado: e.estado || "",
      Fecha: e.fecha || "",
      Completado: e.completado ? "Sí" : "No"
    }));

    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Envios");

    const nombre = soloFiltrados
      ? "envios_filtrados.xlsx"
      : "envios_todos.xlsx";

    const archivoExcel = XLSX.write(libro, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([archivoExcel]), nombre);

    toast.success("📄 Excel generado correctamente");
  };

  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 py-4 border-b border-gray-300">

        <input type="text" placeholder="Buscar..." value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full md:max-w-xs px-4 py-2 rounded-md border border-gray-300" />

        <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300" />

        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300">
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>

        <select value={mensajeroFiltro} onChange={(e) => setMensajeroFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300">
          <option value="">Todos los mensajeros</option>
          {['Jose','Gary','Jeremy','Chris','Uber','Andres','Otro'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

      </div>

      {/* BOTONES SUPERIORES */}
      <div className="flex justify-end gap-3 px-6 py-3 border-b border-gray-300">
        <button onClick={() => exportarExcel(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
          📋 Exportar filtrados
        </button>
        <button onClick={() => exportarExcel(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          📦 Exportar todos
        </button>

        <button
          onClick={copiarEnviosFiltrados}
          className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-md"
        >
          📄 Copiar envíos
        </button>
      </div>

      {/* TABLA */}
      <table className="min-w-full text-sm text-left table-auto">
        <thead className="bg-gray-200 uppercase text-xs font-bold text-zinc-900 border-b border-gray-500">
          <tr>
            {['Cliente','Provincia','Teléfono','Ubicación','Descripción','Notas','Mensajero','Estado','Fecha','Acciones']
              .map(txt => (
                <th key={txt} className="p-3">{txt}</th>
              ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr><td colSpan={10} className="text-center p-6 text-gray-500">No hay registros</td></tr>
          ) : enviosPagina.map(envio => (
<tr
  key={envio.id}
  className={`border-b align-top transition-all ${
    actualizados[envio.id]
      ? `bg-yellow-300  ${animacionesListas ? "animate-pulse" : ""}` : "bg-white hover:bg-gray-100"
  }`}
>



              <td className="p-3 break-words max-w-[180px]">{envio.cliente}</td>
              <td className="p-3 break-words max-w-[150px]">{envio.provincia}</td>
              <td className="p-3 break-words max-w-[140px]">{envio.telefono}</td>

              <td className="p-3 break-words max-w-[160px]">
                {envio.ubicacion ? (
                  <a href={(envio.ubicacion || "").startsWith("http")
                    ? envio.ubicacion
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(envio.ubicacion || "")}`
                  }
                    target="_blank"
                    className="text-blue-600 underline">
                    Ver
                  </a>
                ) : <span className="text-gray-500">Sin ubicación</span>}
              </td>

              <td className="p-3 break-words max-w-[250px] whitespace-pre-line">{envio.descripcion}</td>
              <td className="p-3 break-words max-w-[250px] whitespace-pre-line">{envio.notas || '—'}</td>

              {/* MENSAJERO */}
              <td className="p-3">
                <select
                  value={envio.mensajero || ''}
                  onChange={(e) => cambiarMensajero(envio.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Seleccionar</option>
                  {['Jose','Gary','Jeremy','Chris','Uber','Andres','Otro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>

              {/* ESTADO + COMPLETADO + ACTUALIZADO */}
              <td className="p-3 align-top">
                <div className="flex flex-col gap-1">

                  {/* SELECT + BOTÓN COMPLETADO */}
                  <div className="flex items-center justify-between gap-2">

                    {/* SELECT DE ESTADO */}
                    <select
                      value={envio.estado ?? ''}
                      onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-semibold w-fit
                        ${
                          envio.estado === 'En la mañana' ? 'bg-green-200 text-green-800'
                          : envio.estado === 'En la tarde' ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-blue-200 text-blue-800'
                        }
                      `}
                    >
                      <option>En la mañana</option>
                      <option>En la tarde</option>
                      <option>Mañana</option>
                    </select>

                    {/* BOTÓN COMPLETADO */}
                    <button
                      onClick={() => toggleCompletado(envio.id, envio.completado)}
                      className={`p-1.5 rounded-full border w-fit
                        ${
                          envio.completado
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-gray-400 text-gray-500'
                        }
                      `}
                    >
                      <Check size={16}/>
                    </button>

                  </div>

                  {/* BADGE ANIMADO “ACTUALIZADO” */}
                  {actualizados[envio.id] && (
                    <span className="text-yellow-600 font-bold text-xs tracking-wide animate-typing overflow-hidden whitespace-nowrap">
                  
                    </span>
                  )}

                </div>

                {/* ANIMACIÓN TYPING */}
                <style jsx>{`
                  @keyframes typing {
                    from { width: 0 }
                    to { width: 100% }
                  }
                  .animate-typing {
                    display: inline-block;
                    width: 0;
                    animation: typing 1.2s steps(12, end) forwards;
                  }
                `}</style>
              </td>

              {/* FECHA */}
              <td className="p-3">{formatearFecha(envio.fecha)}</td>

              {/* ACCIONES */}
              <td className="p-3 flex gap-3">

                {/* EDIT */}
                <button
                  onClick={() => abrirEditarEnvio(envio)}
                  className="bg-blue-600 text-white p-2 rounded-full">
                  <Pencil size={16} />
                </button>

                {/* DELETE */}
                <button
                  onClick={() => eliminarEnvio(envio.id)}
                  className="bg-red-600 text-white p-2 rounded-full">
                  <Trash2 size={16} />
                </button>

                {/* COPIAR */}
                <button
                  onClick={() => copiarEnvio(envio)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full">
                  <Copy size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINACIÓN */}
      <div className="flex justify-center items-center gap-2 py-4">
        <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
          disabled={paginaActual === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">
          ◀ Anterior
        </button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
          <button key={num} onClick={() => setPaginaActual(num)}
            className={`px-3 py-1 rounded ${paginaActual === num ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
            {num}
          </button>
        ))}

        <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
          disabled={paginaActual === totalPaginas}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">
          Siguiente ▶
        </button>
      </div>

      {/* MODAL */}
     <Modal isOpen={modalOpen} onClose={cerrarModal} title={
  envioEditando ? "Editar Envío" : "Crear Envío"
}>
  <RegistroEnvioForm
    initialData={envioEditando}
    onSave={guardarEnvio}
    onCancel={cerrarModal}
    modo="columnas"
  />
</Modal>
    </div>
  )
}
