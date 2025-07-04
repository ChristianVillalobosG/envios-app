'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function Bienvenida() {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUserName(
          data.user.user_metadata.full_name ||
          data.user.user_metadata.name ||
          data.user.email
        )
      }
    }
    getUser()
  }, [])

  return <div className="mb-4 text-lg">Bienvenido, <b>{userName}</b></div>
}
