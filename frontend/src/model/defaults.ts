import type { FitConfig, ModelSpec } from "./types";

export function createInitialModel(appVersion: string): ModelSpec {
  return {
    core: [
      {
        id: "D1",
        location: "core",
        function_type: "diode",
        law_id: "shockley_diode",
        evaluation_form: "current_branch",
        placement: "junction_current_branch",
        polarity: "forward",
        params: {
          I0_A: {
            value: 1e-12,
            lower: 1e-30,
            upper: 1,
            fit: true,
            unit: "A",
            label: "I0",
          },
          n: { value: 1.5, lower: 0.5, upper: 10, fit: true, label: "n" },
        },
        metadata: { nickname: "D1", role: "primary" },
      },
    ],
    series: [
      {
        id: "ohmic_1",
        location: "series",
        function_type: "constant_rs",
        law_id: "ohmic",
        evaluation_form: "voltage_drop",
        placement: "series_voltage_drop",
        params: {
          Rs_ohm: {
            value: 10,
            lower: 0,
            upper: 1e9,
            fit: true,
            unit: "Ω",
            label: "Rs",
          },
        },
        metadata: { nickname: "Rs" },
      },
    ],
    parallel: [
      {
        id: "ohmic_2",
        location: "parallel",
        function_type: "constant_rs",
        law_id: "ohmic",
        evaluation_form: "current_branch",
        placement: "parallel_current_branch",
        params: {
          Rs_ohm: {
            value: 1e9,
            lower: 1e3,
            upper: 1e18,
            fit: true,
            unit: "Ω",
            label: "Rsh",
          },
        },
        metadata: { nickname: "Rsh" },
      },
    ],
    temperature_K: 300,
    version: appVersion,
  };
}

export const initialConfig: FitConfig = {
  weighting: "symmetric_log_signed",
  loss: "soft_l1",
  fit_speed: "full",
  exclude_compliance: true,
  max_nfev: 200,
  residual_floor_A: 1e-15,
  multistart_enabled: false,
  multistart_n_seeds: 12,
  run_timeout_s: 60,
  solver_mode: "legacy_composite",
};
