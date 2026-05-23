# Architecture

## Runtime split

```text
React UI -> FastAPI API -> Python fitting engine
```

The fitting engine is the owner of scientific behavior. FastAPI is an adapter. React is only a client.

## Model construction

The model is represented as:

```text
ModelSpec
  core[]
  series[]
  parallel[]
```

Each component is a `ComponentSpec`:

```text
location + function_type + polarity + params + metadata
```

This encodes the principle that forward/reverse/symmetric variants are polarity choices, not separate UI component families.

## Series path

The current MVP uses a lightweight fixed-point approximation:

```text
V = Vj + I Rs_eff(Vj)
```

This is sufficient for the first scaffold but must be strengthened in v0.3 to match the current Tkinter backend.

## Custom expressions

Custom expressions are evaluated in a restricted environment. Available variables:

```text
Vj, absVj, u, s
```

where `u` and `s` come from the polarity helper.

Default parallel branch:

```text
s*A*softplus(u)**m
```

Default series modifier:

```text
A*softplus(u)
```

Series custom expression is interpreted as a conductance boost:

```text
Rs_eff <- Rs_eff/(1 + G_custom)
```
