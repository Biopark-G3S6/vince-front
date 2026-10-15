import type { DiffSegment } from '../model/diff';

type DiffTextProps = {
  segments: DiffSegment[];
  /** Lado apresentado: o anterior mostra as remoções; o atual, as inserções. */
  side: 'before' | 'after';
};

/** Convenção de apresentação: vermelho para o estado anterior, verde para o atual. */
export function DiffText({ segments, side }: DiffTextProps) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'equal') {
          return <span key={index}>{segment.text}</span>;
        }

        if (segment.kind === 'delete' && side === 'before') {
          return (
            <del className="rounded bg-red-100 text-red-900 decoration-red-700" key={index}>
              {segment.text}
            </del>
          );
        }

        if (segment.kind === 'insert' && side === 'after') {
          return (
            <ins className="rounded bg-green-100 text-green-900 no-underline" key={index}>
              {segment.text}
            </ins>
          );
        }

        return null;
      })}
    </>
  );
}
