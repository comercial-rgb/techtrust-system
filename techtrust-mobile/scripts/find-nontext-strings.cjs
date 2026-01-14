const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(fullPath));
    else if (entry.isFile() && fullPath.endsWith('.tsx')) out.push(fullPath);
  }
  return out;
}

function tagNameToString(tagName) {
  if (!tagName) return null;
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  if (ts.isJsxNamespacedName(tagName)) return tagName.name.text;
  return null;
}

function isWithinTextLike(node) {
  let cur = node;
  while (cur) {
    if (ts.isJsxElement(cur)) {
      const name = tagNameToString(cur.openingElement.tagName);
      if (name === 'Text') return true;
    } else if (ts.isJsxSelfClosingElement(cur)) {
      const name = tagNameToString(cur.tagName);
      if (name === 'Text') return true;
    }
    cur = cur.parent;
  }
  return false;
}

function getLineCol(sourceFile, pos) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, col: character + 1 };
}

function report(sourceFile, node, kind, text) {
  const { line, col } = getLineCol(sourceFile, node.getStart(sourceFile));
  console.log(`${sourceFile.fileName}:${line}:${col} [${kind}] ${JSON.stringify(text)}`);
}

function isStringLiteralLike(expr) {
  return ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr);
}

function stringResultFromExpression(expr) {
  if (!expr) return null;
  if (isStringLiteralLike(expr)) return expr.text;
  if (ts.isParenthesizedExpression(expr)) return stringResultFromExpression(expr.expression);

  // cond && 'text'
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return stringResultFromExpression(expr.right);
  }

  // cond ? 'a' : 'b'
  if (ts.isConditionalExpression(expr)) {
    const whenTrue = stringResultFromExpression(expr.whenTrue);
    const whenFalse = stringResultFromExpression(expr.whenFalse);
    if (whenTrue != null && whenFalse != null) return `${whenTrue}|${whenFalse}`;
    return whenTrue ?? whenFalse;
  }

  return null;
}

const root = path.resolve(__dirname, '..', 'src');
const files = walk(root);
let count = 0;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText(sourceFile);
      const text = raw.replace(/\s+/g, ' ').trim();
      if (text && !isWithinTextLike(node)) {
        report(sourceFile, node, 'JsxText', text);
        count++;
      }
    }

    if (ts.isJsxExpression(node) && node.expression) {
      // Only consider JSX expressions that are rendered as children, not attribute initializers.
      const isChildExpression = ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
      if (isChildExpression) {
        const text = stringResultFromExpression(node.expression);
        if (text != null && !isWithinTextLike(node)) {
          report(sourceFile, node, 'JsxExprString', text);
          count++;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log(`\nFound: ${count}`);
process.exitCode = count ? 2 : 0;
