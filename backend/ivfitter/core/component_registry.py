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
            display_name="Softplus conductance modifier",
            role="conductance_modifier_law",
            law_id="softplus_conductance_modifier",
            law_name="Bias-dependent conductance modifier",
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
            help_text="A modifier applied to an existing series path. It is not an independent current branch.",
        ),
        FunctionDefinition(
            function_type="shunt",
            location="parallel",
            display_name="Ohmic law, branch adapter",
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
            help_text="Compatibility adapter for the same Ohmic law when used as a leakage/current branch. New UI explains it as law=form+placement rather than a separate function category.",
        ),
        FunctionDefinition(
            function_type="power_law",
            location="parallel",
            display_name="Softplus power-law current law",
            role="empirical_current_law",
            law_id="softplus_power_law_current",
            law_name="Softplus power-law current relation",
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
            help_text="Empirical high-bias current contribution. Placement decides which node voltage drives this branch.",
        ),
        FunctionDefinition(
            function_type="soft_breakdown",
            location="parallel",
            display_name="Soft reverse-breakdown current law",
            role="empirical_current_law",
            law_id="soft_reverse_breakdown_current",
            law_name="Smooth reverse-breakdown current relation",
            canonical_equation="I = -I0 [exp((-V - Vbr)/Vslope)-1] S((-V - Vbr)/w)",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["reverse"],
            default_polarity="reverse",
            parameters=[
                ParameterDefinition(name="I0_A", default=1e-12, lower=0.0, upper=1.0, unit="A", description="Breakdown current scale."),
                ParameterDefinition(name="Vbr_V", default=10.0, lower=0.0, upper=500.0, unit="V", description="Breakdown onset magnitude."),
                ParameterDefinition(name="Vslope_V", default=1.0, lower=1e-9, upper=100.0, unit="V", description="Exponential slope."),
                ParameterDefinition(name="w_V", default=0.5, lower=1e-9, upper=100.0, unit="V", fit=False, description="Gate smoothing width."),
            ],
            equation_template="I_BR = -I0[exp((-V-Vbr)/Vslope)-1] S((-V-Vbr)/w)",
            help_text="Smooth reverse-bias leakage or breakdown onset current law.",
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
            function_type="photocurrent_voltage_dependent",
            location="parallel",
            display_name="Voltage-dependent photocurrent",
            role="photo_current_law",
            law_id="photocurrent_voltage_dependent",
            law_name="Voltage-dependent photocurrent relation",
            canonical_equation="I_ph(Vj) = s [Iph0(1+a |Vj|) + Aph softplus((|Vj|-Vt)/Vs)^m]",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="symmetric",
            parameters=[
                ParameterDefinition(name="Iph0_A", default=1e-9, lower=0.0, upper=1e3, unit="A", description="Zero-bias photocurrent scale."),
                ParameterDefinition(name="gain_per_V", default=0.0, lower=-1e6, upper=1e6, unit="1/V", description="Linear voltage-dependent collection/gain coefficient."),
                ParameterDefinition(name="Aph", default=0.0, lower=0.0, upper=1e3, unit="A", fit=False, description="Optional threshold photocurrent amplitude; fixed by default to avoid overfitting."),
                ParameterDefinition(name="Vt_ph_V", default=1.0, lower=0.0, upper=500.0, unit="V", fit=False, description="Optional threshold voltage; fixed by default."),
                ParameterDefinition(name="Vs_ph_V", default=1.0, lower=1e-9, upper=100.0, unit="V", fit=False, description="Optional threshold softness; fixed by default."),
                ParameterDefinition(name="m_ph", default=1.0, lower=0.05, upper=10.0, unit="", fit=False, description="Optional threshold exponent; fixed by default."),
                ParameterDefinition(name="direction_sign", default=-1.0, lower=-1.0, upper=1.0, unit="", fit=False, description="Current direction: +1 adds positive terminal current; -1 subtracts it."),
            ],
            equation_template="I_ph(Vj) = s[Iph0(1+a|Vj|)+Aph sp((|Vj|-Vt)/Vs)^m]",
            help_text="Photocurrent branch for field-assisted collection or trap-assisted photogain. Advanced threshold parameters are fixed by default to keep the first fit identifiable.",
        ),
        FunctionDefinition(
            function_type="photoconductive_branch",
            location="parallel",
            display_name="Photoconductive branch",
            role="photo_conductance_law",
            law_id="photoconductive_branch",
            law_name="Photoconductive current branch",
            canonical_equation="I_pc = Gph Vj",
            available_forms=["current_branch"],
            default_form="current_branch",
            allowed_placements=["parallel_current_branch", "junction_current_branch"],
            default_placement="parallel_current_branch",
            allowed_polarities=["forward", "reverse", "symmetric"],
            default_polarity="symmetric",
            parameters=[
                ParameterDefinition(name="Gph_S", default=1e-9, lower=0.0, upper=1e9, unit="S", description="Photo-induced conductance."),
            ],
            equation_template="I_pc = Gph Vj",
            help_text="Light-induced conductive channel. Use when illumination increases conductance rather than adding a bias-independent current source.",
        ),
        FunctionDefinition(
            function_type="series_diode_barrier",
            location="series",
            display_name="Series diode barrier",
            role="series_barrier_voltage_drop",
            law_id="shockley_diode",
            law_name="Shockley diode voltage-drop form",
            canonical_equation="V_drop = n VT ln(I/I0 + 1)",
            available_forms=["voltage_drop"],
            default_form="voltage_drop",
            allowed_placements=["series_voltage_drop"],
            default_placement="series_voltage_drop",
            allowed_polarities=["forward", "reverse"],
            default_polarity="forward",
            parameters=[
                ParameterDefinition(name="I0_A", default=1e-12, lower=1e-30, upper=1.0, unit="A", description="Saturation current scale for the series barrier."),
                ParameterDefinition(name="n", default=1.5, lower=0.5, upper=10.0, unit="", description="Ideality factor for the series barrier voltage drop."),
            ],
            equation_template="V_drop = n VT ln(I/I0 + 1)",
            help_text="Advanced main-path voltage-drop form of the Shockley law. Use for a series contact or injection barrier, not as a parallel current branch.",
        ),
        FunctionDefinition(
            function_type="photo_modulated_main_path",
            location="series",
            display_name="Photo-modulated main path",
            role="photo_modulated_transport_law",
            law_id="photo_modulated_main_path",
            law_name="Photo-modulated main-path transport",
            canonical_equation="V_drop = I R0/(1+photo_gain)",
            available_forms=["voltage_drop"],
            default_form="voltage_drop",
            allowed_placements=["series_voltage_drop"],
            default_placement="series_voltage_drop",
            parameters=[
                ParameterDefinition(name="R0_ohm", default=10.0, lower=0.0, upper=1e12, unit="Ω", description="Dark or baseline main-path resistance."),
                ParameterDefinition(name="photo_gain", default=0.0, lower=-0.95, upper=1e9, unit="", description="Lumped dimensionless light-induced resistance reduction factor."),
            ],
            equation_template="V_drop = I R0/(1+photo_gain)",
            help_text="Main-path voltage-drop term for light-modulated transport, contact, or channel resistance. It is not an extra current branch.",
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
    return {item.function_type: item for item in component_registry()}


def registry_by_key() -> dict[tuple[str, str], FunctionDefinition]:
    """Legacy registry keyed by (location, function_type)."""
    return {(item.location, item.function_type): item for item in component_registry()}
