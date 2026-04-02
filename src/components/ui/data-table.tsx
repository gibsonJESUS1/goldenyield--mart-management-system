import { ReactNode } from "react";

type Column<T> = {
  header: string;
  accessor: keyof T;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
};

export default function DataTable<T>({
  data,
  columns,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            {columns.map((col) => (
              <th key={String(col.accessor)} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-slate-400"
              >
                No records yet
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                {columns.map((col) => (
                  <td key={String(col.accessor)} className="px-4 py-3">
                    {col.render
                      ? col.render(row)
                      : String(row[col.accessor])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}