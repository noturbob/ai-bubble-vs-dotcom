import story from "@/data/story.json";

const SQL = story.sql as Record<string, string>;
const KEYWORDS = new Set(("select from where group by order having with as and or not in is null case when then else end join left using on " +
  "union all distinct over partition filter create replace table view copy to header between like coalesce sum count min max avg " +
  "median list least greatest floor round row_number rank lag lead first_value arg_min arg_max asof regr_slope regr_intercept exp ln " +
  "sqrt values macro desc asc rows preceding following unbounded qualify interval date year month read_csv strftime").split(" "));

/** Colour comments, quoted strings and SQL keywords. Server-rendered, so no client JS. */
function highlight(sql: string) {
  return sql.split(/(--[^\n]*|'[^']*'|\b[A-Za-z_]+\b)/g).map((part, i) => {
    if (part.startsWith("--")) return <span key={i} className="text-[#7a7a7a]">{part}</span>;
    if (part.startsWith("'")) return <span key={i} className="text-forest">{part}</span>;
    if (KEYWORDS.has(part.toLowerCase())) return <span key={i} className="text-ember-ink">{part}</span>;
    return part;
  });
}

/** "Show the SQL" under a chart: the exact query file(s) that computed it, from sql/ via story.json. */
export function SqlPanel({ files, className = "" }: { files: string[]; className?: string }) {
  return (
    <details className={`group overflow-hidden rounded-2xl border border-hairline bg-paper ${className}`}>
      <summary className="mono flex cursor-pointer list-none items-center gap-12 whitespace-nowrap bg-mist px-16 py-8 text-[11px]">
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▸</span>
        Show the SQL
        <span className="ml-auto hidden min-w-0 truncate text-[#6b6b6b] sm:inline">{files.map((f) => `sql/${f}.sql`).join(" · ")}</span>
      </summary>
      {files.map((f) => (
        <div key={f} className="border-t border-hairline">
          <p className="mono px-20 pt-12 text-[10px] text-[#6b6b6b]">sql/{f}.sql</p>
          <pre className="overflow-x-auto px-20 pb-16 pt-8 font-mono text-[12.5px] leading-[1.6] text-ink"><code>{highlight(SQL[f].trim())}</code></pre>
        </div>
      ))}
    </details>
  );
}
