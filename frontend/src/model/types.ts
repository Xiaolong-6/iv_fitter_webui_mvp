export type Polarity = "forward" | "reverse" | "symmetric";
export type Location = "core" | "series" | "parallel";
export type EvaluationForm = "current_branch" | "voltage_drop" | "conductance_modifier" | "implicit_relation";
export type Placement = "junction_current_branch" | "parallel_current_branch" | "series_voltage_drop" | "series_conductance_modifier" | "voltage_transform" | "constraint" | "post_fit_metric";
export type SolverMode = "legacy_composite" | "graph_dc";

export interface ParameterSpec { value: number; lower?: number | null; upper?: number | null; fit?: boolean; unit?: string | null; label?: string | null; description?: string | null; }
export interface ComponentSpec { id: string; location: Location; function_type: string; law_id?: string | null; evaluation_form?: EvaluationForm | null; placement?: Placement | null; node_pos?: string | null; node_neg?: string | null; polarity?: Polarity | null; mode?: string | null; params: Record<string, ParameterSpec>; metadata?: Record<string, unknown>; }
export interface GraphNode { id: string; label?: string | null; role: "terminal" | "internal" | "reference"; }
export interface GraphComponent { id: string; function_type: string; law_id?: string | null; evaluation_form?: EvaluationForm | null; placement: Placement; node_pos: string; node_neg: string; polarity?: Polarity | null; params: Record<string, ParameterSpec>; metadata?: Record<string, unknown>; }
export interface GraphSpec { terminals: string[]; reference_node: string; nodes: GraphNode[]; components: GraphComponent[]; assembly_notes: string[]; schema_version: string; }
export interface ModelSpec { core: ComponentSpec[]; series: ComponentSpec[]; parallel: ComponentSpec[]; graph?: GraphSpec | null; temperature_K: number; version: string; }
export interface TraceData { voltage_V: number[]; current_A: number[]; trace_id: string; metadata: Record<string, unknown>; }
export interface FitConfig { v_min?: number | null; v_max?: number | null; weighting: string; loss: string; fit_speed: string; exclude_compliance: boolean; max_nfev: number; residual_floor_A?: number | null; multistart_enabled?: boolean; seed_scale_factors?: number[]; multistart_n_seeds?: number; run_timeout_s?: number; solver_mode?: SolverMode; }
export interface ParameterResult { value: number; unit?: string | null; fixed: boolean; lower?: number | null; upper?: number | null; stderr?: number | null; }
export interface FitWarning { code: string; message: string; severity: "info" | "warning" | "error"; }
export interface FitCurves { voltage_V: number[]; current_measured_A: number[]; current_fit_A: number[]; residual_A: number[]; branch_currents_A?: Record<string, number[]>; excluded_mask?: boolean[]; }
export interface EquationSummary { title: string; voltage_relation: string[]; core: string[]; series: string[]; parallel: string[]; auxiliary: string[]; topology?: string[]; }
export interface ParameterBoundsSuggestion { component_id: string; param_name: string; lower?: number | null; upper?: number | null; initial?: number | null; source: "registry_default" | "data_suggested" | "not_suggested"; reason: string; }
export interface BoundsSuggestionResponse { suggestions: Record<string, ParameterBoundsSuggestion>; status: string; notes: string[]; }

export interface FitDiagnosticsSummary {
  fit_run_id: string;
  trace_name?: string | null;
  model_signature?: string | null;
  fit_mode?: string | null;
  voltage_range_used?: Array<number | null>;
  points_total: number;
  points_in_selected_range: number;
  points_used: number;
  points_excluded: number;
  free_parameter_count: number;
  fixed_parameter_count: number;
  degrees_of_freedom: number;
  elapsed_s?: number | null;
  solver_name?: string | null;
  solver_mode?: string | null;
  residual_weighting?: string | null;
  loss_function?: string | null;
  objective_name?: string | null;
  optimizer_status?: number | null;
  optimizer_message?: string | null;
  function_evaluations?: number | null;
  jacobian_evaluations?: number | null;
  optimizer_steps?: number | null;
  cost?: number | null;
  optimality?: number | null;
  active_bounds?: string[];
  root_solver_failures?: number | null;
  warnings_count: number;
}

export interface FitSessionStats {
  fitsRun: number;
  totalFunctionEvaluations: number;
  totalElapsedS: number;
  totalRootSolverFailures: number;
}
export interface FitResult { success: boolean; reportable: boolean; reportability_reason?: string; message: string; model: ModelSpec; config: FitConfig; parameters: Record<string, ParameterResult>; metrics: Record<string, number>; warnings: FitWarning[]; fit_diagnostics?: FitDiagnosticsSummary | null; curves: FitCurves; equations: EquationSummary; software_version: string; }
export type SyntheticNoiseMode = "none" | "gaussian_absolute" | "gaussian_relative";
export interface SyntheticNoiseConfig { mode: SyntheticNoiseMode; noise_level_A?: number; relative_noise_fraction?: number; }
export interface SyntheticArtifactConfig { compliance_enabled: boolean; compliance_current_A?: number | null; }
export interface SyntheticTraceRequest { model: ModelSpec; voltage_start: number; voltage_stop: number; voltage_step: number; noise_config: SyntheticNoiseConfig; artifact_config: SyntheticArtifactConfig; trace_name: string; seed?: number | null; }
export interface SyntheticTraceResponse { trace_name: string; voltage_V: number[]; current_A: number[]; metadata: Record<string, unknown>; }
export interface ParameterDefinition { name: string; default: number; lower?: number | null; upper?: number | null; unit?: string | null; fit: boolean; description: string; }
export interface FunctionDefinition { function_type: string; location: Location; display_name: string; role: string; law_id: string; law_name: string; canonical_equation: string; available_forms: EvaluationForm[]; default_form: EvaluationForm; allowed_placements: Placement[]; default_placement: Placement; allowed_polarities: Polarity[]; default_polarity?: Polarity | null; mode?: string | null; parameters: ParameterDefinition[]; equation_template: string; help_text: string; }
