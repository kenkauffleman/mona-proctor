import { useEffect, useState } from 'react'
import { RecordingPage } from './features/history/RecordingPage'
import { ReplayPage } from './features/history/ReplayPage'

function getPathname() {
  return window.location.pathname
}

export default function App() {
  const [pathname, setPathname] = useState(getPathname)

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPathname())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  return pathname === '/replay' ? <ReplayPage /> : <RecordingPage />
}
