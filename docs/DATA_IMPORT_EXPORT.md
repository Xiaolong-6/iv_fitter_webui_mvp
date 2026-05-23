# Data import and export policy

The Web UI must make data handling transparent before fitting.

## Import quality summary

Every imported trace should show:

- selected voltage and current columns;
- rows in file;
- rows imported;
- rows dropped;
- voltage and current ranges;
- warnings about repeated voltages, ambiguous columns, or non-finite rows.

Display unit selectors are preview/display-only. Internal fitting arrays remain SI units: V and A.

## HappyMeasure compatibility

IV-fitter should import HappyMeasure CSV v2 exports:

- `single-v2` single trace;
- `combined-v2 / wide-v2` shared-axis multi-trace files;
- `combined-v2 / long-v2` heterogeneous-axis multi-trace files.

HappyMeasure voltage-source exports use `Voltage_V, Current_A`. HappyMeasure current-source exports use `Current_A, Voltage_V`; IV-fitter must still convert them to internal `voltage_V` and `current_A` arrays correctly.

## Export requirements

A reproducible fit export must include:

- input trace metadata and import quality summary;
- exact `ModelSpec`;
- exact `FitConfig`;
- fitted parameters and bounds;
- metrics, warnings, equations, and software version;
- curve arrays sufficient to redraw plots.

Parameter CSV export is a convenience view. JSON is the archival format.
