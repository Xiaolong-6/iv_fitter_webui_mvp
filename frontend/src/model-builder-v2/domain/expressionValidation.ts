import type { ComponentParameter, ComponentBehavior } from "./schematicTypes";

const allowedFunctions = new Set(["exp", "log", "sqrt", "abs", "softplus", "sigmoid", "tanh", "min", "max", "pow", "sin", "cos"]);
const allowedConstants = new Set(["pi", "PI", "e", "E"]);
const reserved = new Set(["window", "document", "process", "globalThis", "Function", "eval", "while", "for", "import", "export", "return", "class", "new", "this", "prototype"]);

export interface ExpressionValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  usedSymbols: string[];
}

export function validateSymbol(symbol: string): string | null {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) return "Parameter symbol must start with a letter or underscore and contain only letters, numbers, or underscores.";
  if (symbol === "V" || symbol === "I") return "V and I are reserved local variables.";
  if (reserved.has(symbol)) return `Symbol ${symbol} is reserved.`;
  if (allowedFunctions.has(symbol)) return `Symbol ${symbol} conflicts with an allowed function name.`;
  return null;
}

export function validateExpression(expression: string, behavior: ComponentBehavior, parameters: ComponentParameter[]): ExpressionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = expression.trim();
  if (!trimmed) errors.push("Expression cannot be empty.");
  if (/[;{}=[\]`]/.test(trimmed)) errors.push("Expression cannot contain assignment, braces, semicolons, or template syntax.");
  if (/\/\//.test(trimmed) || /\/\*/.test(trimmed)) errors.push("Comments are not allowed inside expressions.");
  const parenBalance = [...trimmed].reduce((sum, ch) => sum + (ch === "(" ? 1 : ch === ")" ? -1 : 0), 0);
  if (parenBalance !== 0) errors.push("Parentheses are not balanced.");
  const names = new Set(parameters.map((parameter) => parameter.symbol));
  const tokens = Array.from(trimmed.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)).map((match) => match[0]);
  const unknown = new Set<string>();
  tokens.forEach((token, index) => {
    const nextChar = trimmed[trimmed.indexOf(token) + token.length];
    if (reserved.has(token)) errors.push(`Reserved token is not allowed: ${token}`);
    if (token === "V" || token === "I" || names.has(token) || allowedFunctions.has(token) || allowedConstants.has(token)) return;
    if (nextChar === "(" && allowedFunctions.has(token)) return;
    unknown.add(token);
    void index;
  });
  unknown.forEach((token) => errors.push(`Unknown symbol: ${token}. Add it as a parameter or use V/I.`));
  const duplicateSymbols = parameters.map((p) => p.symbol).filter((symbol, index, all) => all.indexOf(symbol) !== index);
  if (duplicateSymbols.length > 0) errors.push(`Duplicate parameter symbol: ${Array.from(new Set(duplicateSymbols)).join(", ")}`);
  parameters.forEach((parameter) => {
    const symbolError = validateSymbol(parameter.symbol);
    if (symbolError) errors.push(`${parameter.symbol}: ${symbolError}`);
    if (Number.isNaN(parameter.value)) errors.push(`${parameter.symbol}: value must be numeric.`);
    if (parameter.lower != null && parameter.upper != null && parameter.lower > parameter.upper) errors.push(`${parameter.symbol}: lower bound is greater than upper bound.`);
    if (parameter.lower != null && parameter.value < parameter.lower) warnings.push(`${parameter.symbol}: value is below lower bound.`);
    if (parameter.upper != null && parameter.value > parameter.upper) warnings.push(`${parameter.symbol}: value is above upper bound.`);
  });
  if (behavior === "R_of_V" && /(^|[^A-Za-z0-9_])I([^A-Za-z0-9_]|$)/.test(trimmed)) warnings.push("R(V) usually depends on V. I is allowed, but may create an implicit residual.");
  if (behavior === "I_of_V" && /(^|[^A-Za-z0-9_])I([^A-Za-z0-9_]|$)/.test(trimmed)) warnings.push("I(V) expressions normally should not reference I unless an implicit relation is intended.");
  return { ok: errors.length === 0, errors, warnings, usedSymbols: Array.from(new Set(tokens)) };
}

export function residualPreview(behavior: ComponentBehavior, expression: string): string {
  if (behavior === "R_of_V") return `I - V / (${expression}) = 0`;
  if (behavior === "I_of_V") return `I - (${expression}) = 0`;
  if (behavior === "dV_of_I") return `V - (${expression}) = 0`;
  return `${expression} = 0`;
}
