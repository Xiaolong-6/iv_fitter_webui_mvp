"""Safe custom expression evaluator for branch prototypes."""

from __future__ import annotations

import ast
import numpy as np
from .common import softplus, sigmoid
from ivfitter.core.polarity import polarity_argument, polarity_sign

_ALLOWED_FUNCS = {
    "softplus": softplus,
    "sp": softplus,
    "sigmoid": sigmoid,
    "S": sigmoid,
    "exp": np.exp,
    "log": np.log,
    "log10": np.log10,
    "log1p": np.log1p,
    "sqrt": np.sqrt,
    "abs": np.abs,
    "sign": np.sign,
    "minimum": np.minimum,
    "maximum": np.maximum,
    "clip": np.clip,
    "sin": np.sin,
    "cos": np.cos,
    "tan": np.tan,
    "tanh": np.tanh,
}
_ALLOWED_NODE_TYPES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Load,
    ast.Name, ast.Constant, ast.Add, ast.Sub, ast.Mult, ast.Div,
    ast.Pow, ast.USub, ast.UAdd, ast.Mod,
)


def _parse_and_validate_expression(expression: str) -> ast.Expression:
    """Parse once and validate the exact AST that will be compiled."""
    tree = ast.parse(expression, mode="eval")
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED_NODE_TYPES):
            raise ValueError(f"Unsupported expression node: {type(node).__name__}")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_FUNCS:
                raise ValueError("Only approved numeric functions may be called")
    return tree


def validate_expression(expression: str) -> None:
    """Raise ValueError if expression contains unsupported syntax."""
    _parse_and_validate_expression(expression)


def evaluate_custom_expression(vj, expression: str, params: dict[str, float], polarity: str):
    """Evaluate a vectorized custom expression using Vj, absVj, u, s, and parameters."""
    tree = _parse_and_validate_expression(expression)
    code = compile(tree, "<custom_expr>", "eval")
    vt = float(params.get("Vt_V", params.get("Vt", 0.0)))
    vs = float(params.get("Vs_V", params.get("Vs", 1.0)))
    env = dict(_ALLOWED_FUNCS)
    arr = np.asarray(vj, dtype=float)
    env.update({
        "Vj": arr,
        "absVj": np.abs(arr),
        "u": polarity_argument(arr, vt, vs, polarity),
        "s": polarity_sign(arr, polarity),
    })
    env.update(params)
    return eval(code, {"__builtins__": {}}, env)
