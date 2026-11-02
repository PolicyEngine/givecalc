/**
 * A JSX text that spans lines and holds an HTML entity (&apos;, &ldquo;,
 * &#8220;) loses the spaces that open its first line in the Next.js build:
 * Next 16.2's SWC compiles `to {x} of your`, a line break and
 * `&ldquo;q&rdquo;` to ["to ", x, "of your “q”"]. Vitest compiles JSX
 * another way and keeps the space, so a test of the rendered text cannot
 * catch it; the built page showed "60%of your". This test finds that shape
 * in the source instead.
 *
 * To fix a hit, put the space in an expression ({" "}) and start the text
 * on the next line, or write the character itself (’, “, ”) instead of the
 * entity.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// import.meta.url is not a file URL here, so the path comes from __dirname.
const SRC = resolve(__dirname, "..");
const ENTITY = /&(?:#\d+|#x[0-9a-f]+|[a-z]+\d*);/i;

/** Every JSX text in a file that the build would strip a leading space from. */
export function strippedTexts(fileName: string, source: string): string[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.JsxText) {
      // The full text keeps the leading whitespace that getText() drops.
      const text = node.getFullText(file);
      if (/^[ \t]+\S/.test(text) && text.includes("\n") && ENTITY.test(text)) {
        const { line } = file.getLineAndCharacterOfPosition(node.pos);
        hits.push(`${fileName}:${line + 1}: ${JSON.stringify(text.trim())}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return hits;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("JSX whitespace in the built page", () => {
  it("finds the shape the build strips, and only that shape", () => {
    const lines = (body: string) => `const a = <p>${body}</p>;`;
    // Stripped: the text after {x} spans lines and holds an entity.
    expect(strippedTexts("a.tsx", lines("to {x} of your\n  &ldquo;q&rdquo;."))).toHaveLength(1);
    expect(strippedTexts("a.tsx", lines("{y}\tand\n  John&apos;s."))).toHaveLength(1);
    expect(strippedTexts("a.tsx", lines("{y} and\n  &#8220;q&#8221;."))).toHaveLength(1);
    // Kept: no entity, one line, the space in an expression, or the
    // character itself.
    expect(strippedTexts("a.tsx", lines("to {x} of your\n  income."))).toEqual([]);
    expect(strippedTexts("a.tsx", lines("to {x} of &ldquo;q&rdquo;"))).toEqual([]);
    expect(strippedTexts("a.tsx", lines('to {x}{" "}\n  of &ldquo;q&rdquo;'))).toEqual([]);
    expect(strippedTexts("a.tsx", lines("to {x} of your\n  “q”."))).toEqual([]);
  });

  it("has no text the build would run into the value before it", () => {
    const hits = sourceFiles(SRC).flatMap((path) =>
      strippedTexts(relative(SRC, path), readFileSync(path, "utf8")),
    );
    expect(hits).toEqual([]);
  });
});
