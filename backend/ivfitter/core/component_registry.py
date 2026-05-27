"""Registry of mathematical laws and executable adapters available to the Web UI.

Architecture rule used by v1.3.3:
- law_id names the mathematical relation, for example ``ohmic``.
- function_type remains the backend executable adapter key for compatibility.
- evaluation_form says whether the law is evaluated as current, voltage drop,
  conductance modifier, or a more general implicit relation.
- placement/topology says where that evaluated relation is connected.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from .component_aliases import LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT, LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT


class ParameterDefinition(BaseModel):
    """Default parameter definition for a registered law adapter."""

    name: str
    default: float
    lower: float | None = None
    upper: float | None = None
    unit: str | None = None
    fit: bool = True
    description: str = ""


class FunctionDefinition(BaseModel):
    """Function-library entry used by backend and frontend."""

    function_type: str
    location: str
    display_name: str
    role: str
    law_id: str
    law_name: str
    canonical_equation: str
    available_forms: list[str]
    default_form: str
    allowed_placements: list[str]
    default_placement: str
    allowed_polarities: list[str] = Field(default_factory=list)
    default_polarity: str | None = None
    mode: str | None = None
    parameters: list[ParameterDefinition]
    equation_template: str
    help_text: str


def component_registry() -> list[FunctionDefinition]:
    """Return all built-in mathematical law adapters known to the backend."""
    return [
        FunctionDefinition(
            function_type="diode",
            location="core",
            display_name="Diode current law",
            role="nonlinear_current_law",
            law_id="shockley_diode",
            law_name="Shockley diode exponential law",
            canonical_equation="I = I0 [exp(V/(n VT)) - 1]",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["junction_current_branch", "parallel_current_branch"],
            default_placement="junction_current_branch",
            allowed_polarities=["forward", "reverse"],
            default_polarity="forward",
            parameters=[
                ParameterDefinition(name="I0_A", default=1e-12, lower=1e-30, upper=1.0, unit="A", description="Saturation current."),
                ParameterDefinition(name="n", default=1.5, lower=0.5, upper=10.0, unit="", description="Ideality factor."),
            ],
            equation_template="I_D(V_j)=I0[exp(V_j/(n VT))-1]",
            help_text="Current branch law evaluated at the component voltage. It is not intrinsically a series or parallel category; placement connects it to the junction or another branch.",
        ),
        FunctionDefinition(
            function_type="constant_rs",
            location="series",
            display_name="Ohmic law",
            role="ohmic_law_adapter",
            law_id="ohmic",
            law_name="Ohmic linear law",
            canonical_equation="V = I R  ⇔  I = V/R",
            available_forms=["voltage_drop", "current_branch"],
            default_form="voltage_drop",
            allowed_placements=["series_voltage_drop", "parallel_current_branch", "junction_current_branch"],
            default_placement="series_voltage_drop",
            parameters=[ParameterDefinition(name="Rs_ohm", default=10.0, lower=0.0, upper=1e12, unit="Ω", description="Resistance value. Name is legacy; as a branch this is simply R.")],
            equation_template="voltage_drop: V_drop = I R; current_branch: I = V/R",
            help_text="The same mathematical law represents both Rs and Rsh. In the main path it is a voltage drop; in a branch it is a current contribution.",
        ),
        FunctionDefinition(
            function_type="softplus_rs_modifier",
            location="series",
            display_name="Bias-dependent series conductance modifier",
            role="conductance_modifier_law",
            law_id="softplus_conductance_modifier",
            law_name="Bias-dependent series conductance modifier",
            canonical_equation="R_eff = R_base / [1 + A softplus(u)]",
            available_forms=["conductance_modifier"],
            default_form="conductance_modifier",
            allowed_placements=["series_conductance_modifier"],
            default_placement="series_conductance_modifier",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="symmetric",
            mode="decrease_rs",
            parameters=[
                ParameterDefinition(name="A", default=1.0, lower=0.0, upper=1e9, unit="", description="Modifier amplitude."),
                ParameterDefinition(name="Vt_V", default=5.0, lower=-200.0, upper=200.0, unit="V", description="Turn-on voltage."),
                ParameterDefinition(name="Vs_V", default=0.5, lower=1e-9, upper=100.0, unit="V", description="Softness voltage."),
            ],
            equation_template="R_eff <- R_eff/(1 + A sp(u))",
            help_text="Modifies effective main-path series transport as a function of bias. This is a series-path conductance modifier, not a separate current branch.",
        ),
        FunctionDefinition(
            function_type="shunt",
            location="parallel",
            display_name="Ohmic leakage/current branch",
            role="ohmic_law_adapter_legacy_branch",
            law_id="ohmic",
            law_name="Ohmic linear law",
            canonical_equation="V = I R  ⇔  I = V/R",
            available_forms=["current_branch", "voltage_drop"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch", "series_voltage_drop"],
            default_placement="parallel_current_branch",
            parameters=[ParameterDefinition(name="Rsh_ohm", default=1e9, lower=1e-9, upper=1e18, unit="Ω", description="Resistance value. Name is legacy; mathematically this is the same ohmic R.")],
            equation_template="current_branch: I = V/R; voltage_drop: V_drop = I R",
            help_text="Uses the Ohmic law as a branch current contribution, I = V/R. Typical use: shunt resistance or linear leakage path.",
        ),
        FunctionDefinition(
            function_type="power_law",
            location="parallel",
            display_name="Soft-threshold power-law current branch",
            role="empirical_current_law",
            law_id="softplus_power_law_current",
            law_name="Soft-threshold power-law current branch",
            canonical_equation="I = s A softplus((sV - Vt)/Vs)^m",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="forward",
            parameters=[
                ParameterDefinition(name="A", default=1e-9, lower=0.0, upper=1e3, unit="A", description="Current scale."),
                ParameterDefinition(name="Vt_V", default=5.0, lower=-200.0, upper=200.0, unit="V", description="Threshold voltage."),
                ParameterDefinition(name="Vs_V", default=0.5, lower=1e-9, upper=100.0, unit="V", description="Softness voltage."),
                ParameterDefinition(name="m", default=1.0, lower=0.05, upper=10.0, unit="", description="Power-law exponent."),
            ],
            equation_template="I = s A sp(u)^m",
            help_text="Adds an empirical current branch with smooth threshold behavior and power-law growth. Depending on polarity, it can model extra forward conduction, reverse leakage onset, or high-field conduction.",
        ),
        FunctionDefinition(
            function_type="series_power_law_drop",
            location="series",
            display_name="Softplus power-law voltage drop",
            role="empirical_voltage_drop_law",
            law_id="softplus_power_law_voltage_drop",
            law_name="Softplus power-law main-path voltage-drop relation",
            canonical_equation="V_drop = s A_V softplus((sI - It)/Is)^m",
            available_forms=["voltage_drop"],
            default_form="voltage_drop",
            allowed_placements=["series_voltage_drop"],
            default_placement="series_voltage_drop",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="forward",
            parameters=[
                ParameterDefinition(name="A_V", default=0.1, lower=0.0, upper=1e6, unit="V", description="Voltage-drop scale."),
                ParameterDefinition(name="It_A", default=1e-6, lower=0.0, upper=1e3, unit="A", description="Turn-on current magnitude."),
                ParameterDefinition(name="Is_A", default=1e-6, lower=1e-30, upper=1e3, unit="A", description="Softness current scale."),
                ParameterDefinition(name="m", default=1.0, lower=0.05, upper=10.0, unit="", description="Power-law exponent."),
            ],
            equation_template="V_drop = s A_V sp((sI - It)/Is)^m",
            help_text="Empirical main-path voltage drop with a soft current threshold. Use when extra high-current voltage loss is not well described by a constant Rs.",
        ),
        FunctionDefinition(
            function_type="soft_breakdown",
            location="parallel",
            display_name="Reverse leakage / soft-breakdown current",
            role="empirical_current_law",
            law_id="soft_reverse_breakdown_current",
            law_name="Reverse leakage / soft-breakdown current",
            canonical_equation="I = -I0 [exp((-V - Vbr)/Vslope)-1] S((-V - Vbr)/w)",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["reverse"],
            default_polarity="reverse",
            parameters=[
                ParameterDefinition(name="I0_A", default=1e-12, lower=0.0, upper=1.0, unit="A", description="Reverse leakage current scale."),
                ParameterDefinition(name="Vbr_V", default=10.0, lower=0.0, upper=500.0, unit="V", description="Reverse-bias onset magnitude."),
                ParameterDefinition(name="Vslope_V", default=1.0, lower=1e-9, upper=100.0, unit="V", description="Exponential slope."),
                ParameterDefinition(name="w_V", default=0.5, lower=1e-9, upper=100.0, unit="V", fit=False, description="Gate smoothing width."),
            ],
            equation_template="I_BR = -I0[exp((-V-Vbr)/Vslope)-1] S((-V-Vbr)/w)",
            help_text="Models a repeatable reverse-bias current onset. It may represent reverse leakage, trap-assisted leakage, or soft breakdown; do not interpret it automatically as avalanche or Zener breakdown.",
        ),

        FunctionDefinition(
            function_type="photocurrent_constant",
            location="parallel",
            display_name="Constant photocurrent source",
            role="photo_current_law",
            law_id="photocurrent_constant",
            law_name="Constant photocurrent source",
            canonical_equation="I_ph = s Iph0",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="symmetric",
            parameters=[
                ParameterDefinition(name="Iph0_A", default=1e-9, lower=0.0, upper=1e3, unit="A", description="Photocurrent magnitude."),
                ParameterDefinition(name="direction_sign", default=-1.0, lower=-1.0, upper=1.0, unit="", fit=False, description="Current direction: +1 adds positive terminal current; -1 subtracts it."),
            ],
            equation_template="I_ph = s Iph0",
            help_text="Bias-independent light-generated current branch. Use for photodiode-like light current that is approximately constant with voltage.",
        ),
        FunctionDefinition(
            function_type="bias_dependent_current",
            location="parallel",
            display_name="Bias-dependent current branch",
            role="empirical_current_law",
            law_id="bias_dependent_current",
            law_name="Bias-dependent current branch",
            canonical_equation="I_bias(Vj) = s [I0(1+a |Vj|) + A softplus((|Vj|-Vt)/Vs)^m]",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="symmetric",
            parameters=[
                ParameterDefinition(name="Iph0_A", default=1e-9, lower=0.0, upper=1e3, unit="A", description="Zero-bias current scale. Serialized key is retained for compatibility."),
                ParameterDefinition(name="gain_per_V", default=0.0, lower=-1e6, upper=1e6, unit="1/V", description="Linear bias-dependent gain or leakage coefficient."),
                ParameterDefinition(name="Aph", default=0.0, lower=0.0, upper=1e3, unit="A", fit=False, description="Optional threshold current amplitude. Serialized key is retained for compatibility."),
                ParameterDefinition(name="Vt_ph_V", default=1.0, lower=0.0, upper=500.0, unit="V", fit=False, description="Optional threshold bias. Serialized key is retained for compatibility."),
                ParameterDefinition(name="Vs_ph_V", default=1.0, lower=1e-9, upper=100.0, unit="V", fit=False, description="Optional threshold softness. Serialized key is retained for compatibility."),
                ParameterDefinition(name="m_ph", default=1.0, lower=0.05, upper=10.0, unit="", fit=False, description="Optional threshold exponent. Serialized key is retained for compatibility."),
                ParameterDefinition(name="direction_sign", default=-1.0, lower=-1.0, upper=1.0, unit="", fit=False, description="Current direction: +1 adds positive terminal current; -1 subtracts it."),
            ],
            equation_template="I_bias(Vj) = s[I0(1+a|Vj|)+A sp((|Vj|-Vt)/Vs)^m]",
            help_text="Adds an empirical current branch whose magnitude depends on bias. Depending on the experiment, it may represent voltage-dependent leakage, dark current, trap-assisted current, photocurrent gain, or another non-ideal branch current.",
        ),
        FunctionDefinition(
            function_type="series_diode_barrier",
            location="series",
            display_name="Diode-like series barrier drop",
            role="series_barrier_voltage_drop",
            law_id="shockley_diode",
            law_name="Shockley diode voltage-drop form",
            canonical_equation="V_drop = n VT ln(I/I0 + 1)",
            available_forms=["voltage_drop"],
            default_form="voltage_drop",
            allowed_placements=["series_voltage_drop"],
            default_placement="series_voltage_drop",
            parameters=[
                ParameterDefinition(name="I0_A", default=1e-12, lower=1e-30, upper=1.0, unit="A", description="Saturation current scale for the series barrier."),
                ParameterDefinition(name="n", default=1.5, lower=0.5, upper=10.0, unit="", description="Ideality factor for the series barrier voltage drop."),
            ],
            equation_template="V_drop = n VT ln(I/I0 + 1)",
            help_text="Adds a diode-like voltage drop in the main series path, useful for injection/contact-barrier-like behavior.",
        ),
        FunctionDefinition(
            function_type="custom",
            location="parallel",
            display_name="Custom expression law",
            role="user_defined_law",
            law_id="custom_expression",
            law_name="User-defined mathematical relation",
            canonical_equation="expression(V, absV, u, s, params)",
            available_forms=["current_branch", "conductance_modifier"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch", "series_conductance_modifier"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="forward",
            parameters=[
                ParameterDefinition(name="A", default=1e-9, lower=-1e3, upper=1e3, unit="A", description="User-defined scale."),
                ParameterDefinition(name="Vt_V", default=0.0, lower=-200.0, upper=200.0, unit="V", description="User-defined threshold."),
                ParameterDefinition(name="Vs_V", default=1.0, lower=1e-9, upper=100.0, unit="V", description="User-defined softness."),
                ParameterDefinition(name="m", default=1.0, lower=-10.0, upper=10.0, unit="", description="User-defined exponent."),
            ],
            equation_template="expression(V_component, absV, u, s, params)",
            help_text="Safe vectorized custom expression. The exported result must document the expression.",
        ),
    ]


def registry_by_function() -> dict[str, FunctionDefinition]:
    """Return registry keyed by function_type."""
    items = {item.function_type: item for item in component_registry()}
    items[LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT] = items["bias_dependent_current"]
    items[LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT] = items["bias_dependent_current"]
    return items


def registry_by_key() -> dict[tuple[str, str], FunctionDefinition]:
    """Legacy registry keyed by (location, function_type)."""
    items = {(item.location, item.function_type): item for item in component_registry()}
    items[("parallel", LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT)] = registry_by_function()[LEGACY_VOLTAGE_DEPENDENT_PHOTOCURRENT]
    items[("parallel", LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT)] = registry_by_function()[LEGACY_ALT_VOLTAGE_DEPENDENT_PHOTOCURRENT]
    return items
