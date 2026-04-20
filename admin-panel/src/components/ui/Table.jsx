export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  if (!data.length) {
    return <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className="px-4 py-3 text-left font-semibold text-slate-600"
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, rowIndex) => (
              <tr className="align-top" key={row.id ?? rowIndex}>
                {columns.map((column) => (
                  <td className="px-4 py-4 text-slate-700" key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

