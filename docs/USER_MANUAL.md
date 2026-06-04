# IV-fitter Web UI User Manual

## What IV-fitter does

IV-fitter helps users import current-voltage data, define a two-terminal device model, fit model parameters, inspect the result, and export a report. The current Model Builder direction is graph-native: users define a device as a connected schematic between a fixed positive terminal `V` and a fixed reference terminal `GND`.

## Workflow overview

1. Import measured or pasted IV data.
2. Build or choose a model.
3. Set parameter initial values and fit flags.
4. Run the fit.
5. Inspect curves, residuals, parameters, warnings, and exported report.

## Model Builder

Model Builder is a free schematic editor for two-terminal compact IV models. Its canvas toolbar includes clear canvas, presets, save, Synthetic IV trace, and Go to fitting actions.

### Terminals

The canvas always contains:

- `V`: the external voltage terminal.
- `GND`: the reference terminal, `V = 0`.

A model is valid when at least one connected component path exists from `V` to `GND`.

### Component palette

The left Components panel contains component functions. Each component is a two-terminal function. Resistors, Shockley diodes, constant-current sources, custom functions, and saved custom templates are presets/templates, not special topology classes. Drag an entry from the list onto the canvas to add it.

Available behavior forms:

| Behavior | Meaning | Example |
|---|---|---|
| `R(V)` | Resistance as a function of local voltage | `R = R0` |
| `I(V)` | Current as a function of local voltage | `I = I0 * (exp(V/(n*Vt)) - 1)` |
| `ΔV(I)` | Voltage drop as a function of local current | `V = I * R0` |
| `F(I,V)=0` | Implicit residual relation | `I - A * V = 0` |

### Building a model

1. Drag a component function from the left palette into the canvas.
2. Connect ports by dragging from one port to another.
3. Use only the V-to-GND connected part of the schematic for the actual model.
4. Leave draft or unused components on the canvas if needed. They are ignored until connected.
5. If the compiler creates a junction label such as `V1`, drag the label to move the actual junction dot and its connected wires.

### Editing a component

Select a component to open the inspector. The inspector lets you edit:

- component name,
- behavior form: `R(V)`, `I(V)`, `ΔV(I)`, or residual,
- preset,
- sign / polarity,
- expression,
- parameter table.

Parameter rows include:

- symbol,
- value,
- lower bound,
- upper bound,
- fit flag.

The local variables are:

- `V`: local voltage drop from the component positive port to negative port,
- `I`: local branch current according to the component orientation.

### Validation

The validation status reports whether the schematic is ready to compile. Disconnected or half-connected components are not drawing errors, but they are not part of fitting. Open branches remain visible on the canvas and are drawn with an ignored/dashed style so the visual schematic matches the compiled fitting state.

### Compilation rule

The compiler extracts the active V-to-GND subgraph and converts it into backend graph data. React Flow positions and visual edges are not physics truth; the model truth is the graph of component ports and wires.

The canvas equation area shows two layers:

- component equations, using each component's local voltage drop and current convention;
- an assembly summary generated from the current graph, including the active fitting component set, detected series set, detected branch set, node-voltage convention, and residual form used by fitting.

## Fitting page

After building the model, go to the fitting page and run the fit. The parameter table shows current parameter values, bounds, standard errors when available, and fit status.

## Reports

Reports should include the model, selected trace, fit result, parameters, diagnostics, warnings, and exported plot data. Report text should reflect the actual model shown in the Model Builder.

## Practical modeling guidance

Start simple:

1. Begin with one `R(V)` or one `I(V)` component.
2. Add branches only when residuals show missing physics.
3. Keep custom expressions as simple as possible.
4. Fit fewer parameters first; release more parameters only after the fit is stable.

## Synthetic IV trace

Use the **Synthetic IV trace** toolbar button on the Model Builder canvas to forward-simulate from the current model. The dialog supports voltage sweep controls, optional noise, random seed, current compliance, CSV-only generation, and generate-and-import. Synthetic data is a debugging and validation aid; it does not prove that a model is physically correct for a real device.

## Known boundaries

Model Builder is for DC steady-state two-terminal IV models. It is not a full SPICE replacement. It does not currently model capacitors, inductors, time-domain transients, or multi-terminal devices.
