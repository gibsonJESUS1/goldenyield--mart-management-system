"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  name: string;
  href: string;
  exact?: boolean;
};

const links: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", exact: true },
  { name: "Products", href: "/products" },
  { name: "Owners", href: "/owners" },
  { name: "Categories", href: "/categories" },
  { name: "Units", href: "/units" },
  { name: "Inventory", href: "/inventory" },
  { name: "Sales", href: "/sales", exact: true },
  { name: "Sales History", href: "/sales/history" },
  { name: "Debts", href: "/debts" },
  { name: "Purchases", href: "/purchases" },
  { name: "Reports", href: "/reports" },
];

function isActivePath(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r border-slate-200 bg-white p-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          YieldMart
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Shop System</h1>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const active = isActivePath(pathname, link.href, link.exact);

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}