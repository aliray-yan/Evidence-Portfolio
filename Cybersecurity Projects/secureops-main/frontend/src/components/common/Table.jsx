import { cx } from '../../utils/helpers';

export default function Table({ columns, data = [], empty = 'No records found', onRowClick }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/80">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cx('px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.length ? (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cx('transition hover:bg-slate-50 dark:hover:bg-slate-800/60', onRowClick && 'cursor-pointer')}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cx('px-4 py-3 align-middle text-slate-700 dark:text-slate-200', column.cellClassName)}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
