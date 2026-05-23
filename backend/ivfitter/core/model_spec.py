"""Serializable model, topology graph, and fitting schemas for the Web UI backend."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator

Polarity = Literal["forward", "reverse", "symmetric"]
EvaluationForm = Literal["current_branch", "voltage_drop", "conductance_modifier", "implicit_relation"]
# Legacy UI buckets retained for backwards compatibility with existing requests.
Location = Literal["core", "series", "parallel"]
Placement = Literal[
    "junction_current_branch",
    "parallel_current_branch",
    "series_voltage_drop",
    "series_conductance_modifier",
    "voltage_transform",
    "constraint",
    "post_fit_metric",
]
SolverMode = Literal["legacy_composite", "graph_dc"]


class ParameterSpec(BaseModel):
    """A scalar model parameter with bounds and fit/fixed state."""

    value: float
    lower: float | None = None
    upper: float | None = None
    stderr: float | None = None
    fit: bool = True
    unit: str | None = None
    label: str | None = None
    description: str | None = None

    @field_validator("upper")
    @classmethod
    def upper_above_lower(cls, upper: float | None, info):
        lower = info.data.get("lower")
        if lower is not None and upper is not None and upper < lower:
            raise ValueError("upper must be >= lower")
        return upper


class ComponentSpec(BaseModel):
    """One component instance.

    function_type identifies the equation. placement/topology identifies how that equation
    is assembled into the model. location is a legacy UI bucket and must not be treated as
    the function identity.
    """

    id: str
    location: Location
    function_type: str
    # v1.3.3 semantics: function_type remains the executable backend adapter key.
    # law_id is the mathematical law identity, shared by adapters such as legacy Rs/Rsh.
    law_id: str | None = None
    evaluation_form: EvaluationForm | None = None
    placement: Placement | None = None
    node_pos: str | None = None
    node_neg: str | None = None
    polarity: Polarity | None = None
    mode: str | None = None
    params: dict[str, ParameterSpec] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphNode(BaseModel):
    """A named node in the DC topology graph."""

    id: str
    label: str | None = None
    role: Literal["terminal", "internal", "reference"] = "internal"


class GraphComponent(BaseModel):
    """A component edge in the topology graph."""

    id: str
    function_type: str
    law_id: str | None = None
    evaluation_form: EvaluationForm | None = None
    placement: Placement
    node_pos: str
    node_neg: str
    polarity: Polarity | None = None
    params: dict[str, ParameterSpec] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphSpec(BaseModel):
    """DC topology graph used for transparent assembly and future graph solving."""

    terminals: list[str] = Field(default_factory=lambda: ["anode", "cathode"])
    reference_node: str = "cathode"
    nodes: list[GraphNode] = Field(default_factory=list)
    components: list[GraphComponent] = Field(default_factory=list)
    assembly_notes: list[str] = Field(default_factory=list)
    schema_version: str = "GraphSpec v1"


class ModelSpec(BaseModel):
    """Complete IV model grouped by legacy UI buckets plus optional topology graph."""

    core: list[ComponentSpec] = Field(default_factory=list)
    series: list[ComponentSpec] = Field(default_factory=list)
    parallel: list[ComponentSpec] = Field(default_factory=list)
    graph: GraphSpec | None = None
    temperature_K: float = 300.0
    version: str = "1.0.0"


class TraceData(BaseModel):
    """Trace data passed to the fitter."""

    voltage_V: list[float]
    current_A: list[float]
    trace_id: str = "trace"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("current_A")
    @classmethod
    def same_length(cls, current: list[float], info):
        voltage = info.data.get("voltage_V")
        if voltage is not None and len(voltage) != len(current):
            raise ValueError("voltage_V and current_A must have the same length")
        return current


class FitConfig(BaseModel):
    """Numerical fitting options."""

    v_min: float | None = None
    v_max: float | None = None
    weighting: str = "symmetric_log_signed"
    loss: str = "soft_l1"
    fit_speed: str = "full"
    exclude_compliance: bool = True
    max_nfev: int = 500
    residual_floor_A: float = 1e-15
    multistart_enabled: bool = False
    seed_scale_factors: list[float] = Field(default_factory=list)
    multistart_n_seeds: int = 12
    run_timeout_s: float = 60.0
    solver_mode: SolverMode = "legacy_composite"

    @field_validator("seed_scale_factors")
    @classmethod
    def reject_seed_scale_factors(cls, value: list[float]) -> list[float]:
        if value:
            raise ValueError("seed_scale_factors is deprecated and ignored; use multistart_n_seeds instead.")
        return value


class FitRequest(BaseModel):
    """Request payload for one trace fit."""

    trace: TraceData
    model: ModelSpec
    config: FitConfig = Field(default_factory=FitConfig)


class ParameterResult(BaseModel):
    """Fitted parameter output."""

    value: float
    unit: str | None = None
    fixed: bool = False
    lower: float | None = None
    upper: float | None = None
    stderr: float | None = None


class FitWarning(BaseModel):
    """Human-readable warning generated during validation or fitting."""

    code: str
    message: str
    severity: Literal["info", "warning", "error"] = "warning"


class FitCurves(BaseModel):
    """Curve arrays returned to the UI."""

    voltage_V: list[float]
    current_measured_A: list[float]
    current_fit_A: list[float]
    residual_A: list[float]
    branch_currents_A: dict[str, list[float]] = Field(default_factory=dict)
    excluded_mask: list[bool] = Field(default_factory=list)


class EquationSummary(BaseModel):
    """Generated model equation summary."""

    title: str
    voltage_relation: list[str] = Field(default_factory=list)
    core: list[str] = Field(default_factory=list)
    series: list[str] = Field(default_factory=list)
    parallel: list[str] = Field(default_factory=list)
    auxiliary: list[str] = Field(default_factory=list)
    topology: list[str] = Field(default_factory=list)


class FitResult(BaseModel):
    """Reproducible fit result returned by the backend."""

    success: bool
    reportable: bool = True
    reportability_reason: str = "passed backend checks"
    message: str
    model: ModelSpec
    config: FitConfig
    parameters: dict[str, ParameterResult]
    metrics: dict[str, float]
    warnings: list[FitWarning]
    curves: FitCurves
    equations: EquationSummary
    software_version: str = "1.0.0"
