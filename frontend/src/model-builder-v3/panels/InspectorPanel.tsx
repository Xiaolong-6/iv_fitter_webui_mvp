import { useState, type PointerEvent } from "react";
import type { Mb3Behavior, Mb3Component, Mb3Parameter } from "../domain/types";

export type Mb3TemplateInspectorDetails = {
  label: string;
  behavior: Mb3Behavior;
  expression: string;
  parameters: Mb3Parameter[];
};

function supportsPolarityToggle(component: Mb3Component | null): boolean {
  if (!component) return false;
  if (component.templateKey === "resistance") return false;
  if (component.behavior === "R_of_V") return false;
  return component.behavior === "I_of_V" || component.behavior === "dV_of_I" || component.behavior === "residual";
}

export function InspectorPanel({
  component,
  templateDetails,
  position,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onRenameComponent,
  onUpdateComponentBehavior,
  onUpdateComponentExpression,
  onUpdateComponentSign,
  onAddComponentParameter,
  onUpdateComponentParameter,
  onSaveCustomComponentTemplate,
  onAddTemplateComponent,
  onDuplicateComponent,
}: {
  component: Mb3Component | null;
  templateDetails: Mb3TemplateInspectorDetails | null;
  position: { x: number; y: number };
  onDragPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onDragPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onDragPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onRenameComponent: (componentId: string, label: string) => void;
  onUpdateComponentBehavior: (componentId: string, behavior: Mb3Behavior) => void;
  onUpdateComponentExpression: (componentId: string, expression: string) => void;
  onUpdateComponentSign: (componentId: string, sign: 1 | -1) => void;
  onAddComponentParameter: (componentId: string, parameter: Mb3Parameter) => void;
  onUpdateComponentParameter: (
    componentId: string,
    symbol: string,
    changes: Partial<Omit<Mb3Parameter, "symbol">>,
  ) => void;
  onSaveCustomComponentTemplate: (component: Mb3Component) => void;
  onAddTemplateComponent?: () => void;
  onDuplicateComponent?: (component: Mb3Component) => void;
}) {
  const details = component ?? templateDetails;
  const canEditCustom = component?.templateKey === "custom";
  const canTogglePolarity = supportsPolarityToggle(component);
  const [newParameterSymbol, setNewParameterSymbol] = useState("");

  const addCustomParameter = () => {
    if (!component || !newParameterSymbol.trim()) return;
    onAddComponentParameter(component.id, {
      symbol: newParameterSymbol,
      value: 1,
      lower: null,
      upper: null,
      fit: true,
      unit: "1",
    });
    setNewParameterSymbol("");
  };
  const parseRequiredNumber = (value: string): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const parseOptionalNumber = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const formatParameterNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "";
    if (value === 0) return "0";
    const abs = Math.abs(value);
    if (abs >= 1e4 || abs < 1e-3) {
      return value.toExponential(3).replace(/\.?0+e/, "e");
    }
    return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
  };
  const inferParameterUnit = (parameter: Mb3Parameter): string => {
    if (parameter.unit) return parameter.unit;
    if (/^r/i.test(parameter.symbol)) return "ohm";
    if (/^i/i.test(parameter.symbol)) return "A";
    if (/^t$/i.test(parameter.symbol)) return "K";
    return "1";
  };

  return (
    <aside
      className="mbv3-inspector-float"
      style={{ left: position.x, top: position.y }}
      aria-label="Inspector"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={onDragPointerUp}
    >
      <div className="mbv3-inspector-head" onPointerDown={onDragPointerDown}>
        <strong>Inspector</strong>
        {component ? (
          <button
            type="button"
            className="mbv3-inspector-head-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicateComponent?.(component);
            }}
          >
            Duplicate
          </button>
        ) : templateDetails ? (
          <button
            type="button"
            className="mbv3-inspector-head-action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddTemplateComponent?.();
            }}
          >
            Add
          </button>
        ) : null}
        <span className="mbv3-drag-grip" aria-hidden="true" />
      </div>
      {details ? (
        <div className="mbv3-inspector-body">
          <div className="mbv3-inspector-row">
            <span>Name</span>
            {component ? (
              <input
                className="mbv3-inspector-name-input"
                value={component.label}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => onRenameComponent(component.id, event.target.value)}
              />
            ) : (
              <b>{details.label}</b>
            )}
          </div>
          <div className="mbv3-inspector-row">
            <span>Behavior</span>
            {canEditCustom ? (
              <select
                className="mbv3-inspector-select"
                value={component.behavior}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  onUpdateComponentBehavior(component.id, event.target.value as Mb3Behavior)
                }
              >
                <option value="R_of_V">R(V) resistance</option>
                <option value="I_of_V">I(V) current</option>
                <option value="dV_of_I">Delta V(I) voltage drop</option>
              </select>
            ) : (
              <b>{details.behavior}</b>
            )}
          </div>
          <div className="mbv3-inspector-row">
            <span>Expression</span>
            {canEditCustom ? (
              <textarea
                className="mbv3-inspector-expression-input"
                value={component.expression}
                rows={3}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => onUpdateComponentExpression(component.id, event.target.value)}
              />
            ) : (
              <code>{details.expression}</code>
            )}
          </div>
          {component ? (
            <div className="mbv3-inspector-row mbv3-inspector-polarity-row">
              <span>Polarity</span>
              {canTogglePolarity ? (
                <label className="mbv3-inspector-toggle">
                  <input
                    type="checkbox"
                    checked={component.sign === -1}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onUpdateComponentSign(component.id, event.target.checked ? -1 : 1)
                    }
                  />
                  <span>{component.sign === -1 ? "Reverse" : "Forward"}</span>
                </label>
              ) : (
                <b title="Ohmic R(V) components are orientation-neutral.">Symmetric</b>
              )}
            </div>
          ) : null}
          {canEditCustom ? (
            <button
              className="mbv3-inspector-save-template"
              type="button"
              onClick={() => onSaveCustomComponentTemplate(component)}
            >
              Save to components
            </button>
          ) : null}
          <div className="mbv3-inspector-param-block">
            <div className="mbv3-inspector-param-head">
              <span>Parameters</span>
            </div>
            <div className="mbv3-inspector-param-table">
              <div>Symbol</div>
              <div>Initial value</div>
              <div>Unit</div>
              <div>Lower</div>
              <div>Upper</div>
              <div>Fit</div>
              {details.parameters.map((parameter) => (
                <div
                  className="mbv3-inspector-param-row"
                  key={`${component?.id ?? "template"}:${parameter.symbol}`}
                >
                  <div>{parameter.symbol}</div>
                  <div>
                    {component ? (
                      <input
                        className="mbv3-param-input"
                        defaultValue={formatParameterNumber(parameter.value)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onBlur={(event) => {
                          const value = parseRequiredNumber(event.target.value);
                          if (value !== null) {
                            onUpdateComponentParameter(component.id, parameter.symbol, { value });
                          } else {
                            event.target.value = String(parameter.value);
                          }
                        }}
                      />
                    ) : (
                      parameter.value
                    )}
                  </div>
                  <div>{inferParameterUnit(parameter)}</div>
                  <div>
                    {component ? (
                      <input
                        className="mbv3-param-input"
                        defaultValue={formatParameterNumber(parameter.lower)}
                        placeholder="-"
                        onPointerDown={(event) => event.stopPropagation()}
                        onBlur={(event) =>
                          onUpdateComponentParameter(component.id, parameter.symbol, {
                            lower: parseOptionalNumber(event.target.value),
                          })
                        }
                      />
                    ) : (
                      parameter.lower ?? "-"
                    )}
                  </div>
                  <div>
                    {component ? (
                      <input
                        className="mbv3-param-input"
                        defaultValue={formatParameterNumber(parameter.upper)}
                        placeholder="-"
                        onPointerDown={(event) => event.stopPropagation()}
                        onBlur={(event) =>
                          onUpdateComponentParameter(component.id, parameter.symbol, {
                            upper: parseOptionalNumber(event.target.value),
                          })
                        }
                      />
                    ) : (
                      parameter.upper ?? "-"
                    )}
                  </div>
                  <div className="mbv3-param-fit-cell">
                    {component ? (
                      <input
                        type="checkbox"
                        checked={parameter.fit}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          onUpdateComponentParameter(component.id, parameter.symbol, {
                            fit: event.target.checked,
                          })
                        }
                      />
                    ) : (
                      parameter.fit ? "Yes" : "No"
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canEditCustom ? (
              <div className="mbv3-inspector-param-add">
                <input
                  className="mbv3-inspector-name-input"
                  value={newParameterSymbol}
                  placeholder="Parameter symbol"
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) => setNewParameterSymbol(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomParameter();
                    }
                  }}
                />
                <button type="button" onClick={addCustomParameter}>
                  Add parameter
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mbv3-inspector-empty">
          Select a component on the canvas to inspect its details.
        </p>
      )}
    </aside>
  );
}
