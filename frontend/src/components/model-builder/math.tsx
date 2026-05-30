import { BlockMath as KatexBlockMath } from "react-katex";

export function BlockMath({ math }: { math: string }) {
  return <KatexBlockMath math={math} errorColor="#b91c1c" renderError={(error) => <code className="katex-render-error">{String(error)}</code>} />;
}
