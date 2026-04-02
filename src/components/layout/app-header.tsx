export default function AppHeader() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h2 className="font-semibold text-lg">Management Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-500">
          Internet Sync Active
        </div>

        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
          Y
        </div>
      </div>
    </header>
  )
}