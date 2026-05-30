import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FittingPage } from "../FittingPage";
import { createInitialModel, initialConfig } from "../../model/defaults";
import type { FitResult, FunctionDefinition, TraceData } from "../../model/types";

const mockGetRegistry = vi.fn<() => Promise<FunctionDefinition[]>>();
const mockEquations = vi.fn();
const mockImportCsvTextMulti = vi.fn();
const mockFitTrace = vi.fn();
const mockExportReport = vi.fn();
const mockExportReportCsv = vi.fn();

vi.mock("../../api/client", () => ({
  getRegistry: () => mockGetRegistry(),
  equations: (...args: unknown[]) => mockEquations(...args),
  importCsvTextMulti: (...args: unknown[]) => mockImportCsvTextMulti(...args),
  fitTrace: (...args: unknown[]) => mockFitTrace(...args),
  exportReport: (...args: unknown[]) => mockExportReport(...args),
  exportReportCsv: (...args: unknown[]) => mockExportReportCsv(...args),
}));

vi.mock("../../services/releaseCheck", () => ({
  checkLatestRelease: () => Promise.resolve({
    updateAvailable: false,
    currentVersion: "1.8.18",
    latestVersion: "1.8.18",
    releaseUrl: null,
    error: null,
  }),
}));

const trace: TraceData = {
  trace_id: "synthetic_test_trace",
  voltage_V: [-0.1, 0, 0.1],
  current_A: [-1e-9, 0, 1e-9],
  metadata: { dataset_name: "synthetic_test_trace" },
};

function fakeFitResult(): FitResult {
  const model = createInitialModel("1.8.18-test");
  return {
    success: true,
    reportable: true,
    message: "ok",
    model,
    config: initialConfig,
    parameters: {
      "D1.I0_A": { value: 1e-12, unit: "A", fixed: false, lower: 1e-15, upper: 1e-6, stderr: 1e-13 },
    },
    metrics: {
      linear_rmse_A: 1e-12,
      normalized_rmse: 0.001,
      linear_r2: 0.999,
      log_magnitude_r2: 0.998,
      log_magnitude_mae_decades: 0.01,
      reduced_chi_square: 1.0,
    },
    warnings: [],
    fit_diagnostics: {
      fit_run_id: "test-fit",
      model_signature: "test-model",
      fit_mode: "test",
      voltage_range_used: [-0.1, 0.1],
      points_total: 3,
      points_in_selected_range: 3,
      points_used: 3,
      points_excluded: 0,
      free_parameter_count: 1,
      fixed_parameter_count: 0,
      degrees_of_freedom: 2,
      elapsed_s: 0.01,
      solver_name: "least_squares",
      solver_mode: "legacy_composite",
      residual_weighting: "linear",
      loss_function: "linear",
      objective_name: "linear_rmse",
      optimizer_status: 1,
      optimizer_message: "ok",
      function_evaluations: 3,
      jacobian_evaluations: 1,
      optimizer_steps: 1,
      cost: 1e-24,
      optimality: 1e-12,
      active_bounds: [],
      root_solver_failures: 0,
      warnings_count: 0,
    },
    curves: {
      voltage_V: trace.voltage_V,
      current_measured_A: trace.current_A,
      current_fit_A: trace.current_A,
      residual_A: [0, 0, 0],
    },
    equations: {
      title: "Single diode",
      voltage_relation: ["V_j = V_ext"],
      core: [],
      series: [],
      parallel: ["I_D = I0(exp(V_j/nV_T)-1)"],
      auxiliary: [],
    },
    software_version: "1.8.18-test",
  };
}

function setupMocks() {
  vi.clearAllMocks();
  mockGetRegistry.mockResolvedValue([]);
  mockEquations.mockResolvedValue({
    title: "Single diode",
    voltage_relation: ["V_j = V_ext"],
    core: [],
    series: [],
    parallel: [],
    auxiliary: [],
  });
  mockImportCsvTextMulti.mockResolvedValue({
    traces: [{
      trace,
      quality: {
        rows_in_file: 3,
        rows_imported: 3,
        rows_dropped: 0,
        voltage_col: "Voltage",
        current_col: "Current",
        voltage_min_V: -0.1,
        voltage_max_V: 0.1,
        current_min_A: -1e-9,
        current_max_A: 1e-9,
        warnings: [],
      },
    }],
    summary: "1 trace loaded",
    warnings: [],
  });
  mockFitTrace.mockResolvedValue(fakeFitResult());
  mockExportReport.mockResolvedValue({ markdown: "# IV-fitter report" });
  mockExportReportCsv.mockResolvedValue({ text: "parameter,value\nD1.I0_A,1e-12\n" });
}

describe("FittingPage", () => {
  it("renders the workflow shell without crashing", async () => {
    setupMocks();
    render(<FittingPage />);
    expect(await screen.findByText("Welcome to IV-fitter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start with data/i })).toBeInTheDocument();
  });

  it("imports a pasted trace, runs a mocked fit, and renders the fitted status", async () => {
    setupMocks();
    render(<FittingPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Start with data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Paste data/i }));
    fireEvent.change(screen.getByPlaceholderText(/Voltage \(V\), Current \(A\)/i), {
      target: { value: "Voltage (V), Current (A)\n-0.1,-1e-9\n0,0\n0.1,1e-9" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Parse pasted data/i }));

    await waitFor(() => expect(mockImportCsvTextMulti).toHaveBeenCalled());
    fireEvent.click(screen.getByTitle(/Configure, run, and inspect the fit/i));
    fireEvent.click(screen.getByRole("button", { name: /Run fit/i }));

    await waitFor(() => expect(mockFitTrace).toHaveBeenCalled());
    expect(await screen.findByText(/Converged/i)).toBeInTheDocument();
    await waitFor(() => expect(mockExportReport).toHaveBeenCalled());
  });
});
