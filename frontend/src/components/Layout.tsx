import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout(): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-sala">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
