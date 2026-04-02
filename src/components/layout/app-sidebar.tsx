"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Products", href: "/products" },
  { name: "Owners", href: "/owners" },
   { name: "Categories", href: "/categories" },
    { name: "Units", href: "/units" },
  { name: "Inventory", href: "/inventory" },
  { name: "Sales", href: "/sales" },
  { name: "Debts", href: "/debts" },
  { name: "Reports", href: "/reports" },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-white border-r border-slate-200 p-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">
          YieldMart
        </p>
        <h1 className="text-2xl font-bold mt-2">Shop System</h1>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition
                ${
                  active
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {link.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}