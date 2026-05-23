# Data import and export policy

The Web UI must make data handling transparent before fitting.

## Import quality summary

Every imported trace should show:

- selected voltage and current columns;
- rows in file;
- rows imported;
- rows dropped;
- voltage and current ranges;
- warnings about repeated voltages or non-finite rows.

## Export requirements

A reproducible fit export must include:

- input trace metadata and import quality summary;
- exact `ModelSpec`;
- exact `FitConfig`;
- fitted parameters and bounds;
- metrics, warnings, equations, and software version;
- curve arrays sufficient to redraw plots.

Parameter CSV export is a convenience view, not the archival format. JSON is the archival format.
