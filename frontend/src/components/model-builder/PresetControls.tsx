import { useEffect, useMemo, useState } from "react";
import type { ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import {
  cloneModelForPreset,
  makeDoubleDiodePreset,
  makeSingleDiodePreset,
  readBuilderPresets,
  writeBuilderPresets,
} from "./modelHelpers";
import type { BuilderPreset } from "./types";

type PresetDialog =
  | { mode: "save"; value: string }
  | { mode: "rename"; value: string; index: number }
  | { mode: "delete"; index: number }
  | null;

function stableModelJson(model: ModelSpec) {
  return JSON.stringify(model);
}

function presetLabel(value: string, language: Language, customPresets: BuilderPreset[], dirty: boolean) {
  const suffix = dirty ? " *" : "";
  if (value === "single") return (language === "zh" ? "单二极管模型" : "Single diode model") + suffix;
  if (value === "double") return (language === "zh" ? "双二极管模型" : "Double diode model") + suffix;
  if (value.startsWith("custom:")) {
    const preset = customPresets[Number(value.split(":")[1])];
    return (preset?.name ?? (language === "zh" ? "自定义模型" : "Custom model")) + suffix;
  }
  return (language === "zh" ? "自定义模型" : "Custom model") + suffix;
}

export function ModelPresetControls({ model, language, onChange, disabled, onAfterPreset, onGoToFitting }: {
  model: ModelSpec;
  language: Language;
  onChange: (model: ModelSpec) => void;
  disabled?: boolean;
  onAfterPreset: (model: ModelSpec) => void;
  onGoToFitting?: () => void;
}) {
  const [customPresets, setCustomPresets] = useState<BuilderPreset[]>(() => typeof window === "undefined" ? [] : readBuilderPresets());
  const [selected, setSelected] = useState("single");
  const [dialog, setDialog] = useState<PresetDialog>(null);
  const customOptions = useMemo(() => customPresets.map((preset, index) => ({ id: `custom:${index}`, name: preset.name })), [customPresets]);
  const customIndex = selected.startsWith("custom:") ? Number(selected.split(":")[1]) : -1;
  const selectedCustom = customIndex >= 0 ? customPresets[customIndex] : null;

  const referenceModel = useMemo<ModelSpec | null>(() => {
    if (selected === "single") return makeSingleDiodePreset(model);
    if (selected === "double") return makeDoubleDiodePreset(model);
    if (selectedCustom) return cloneModelForPreset(selectedCustom.model);
    return null;
  }, [model, selected, selectedCustom]);
  const dirty = referenceModel ? stableModelJson(model) !== stableModelJson(referenceModel) : true;

  useEffect(() => { if (typeof window !== "undefined") writeBuilderPresets(customPresets); }, [customPresets]);

  function modelForPreset(value: string): ModelSpec | null {
    if (value === "single") return makeSingleDiodePreset(model);
    if (value === "double") return makeDoubleDiodePreset(model);
    if (value.startsWith("custom:")) {
      const preset = customPresets[Number(value.split(":")[1])];
      if (preset) return cloneModelForPreset(preset.model);
    }
    return null;
  }

  function apply(value: string) {
    setSelected(value);
    if (disabled) return;
    const next = modelForPreset(value);
    if (next) {
      onChange(next);
      onAfterPreset(next);
    }
  }

  function resetSelectedPreset() {
    if (disabled) return;
    const next = modelForPreset(selected) ?? makeSingleDiodePreset(model);
    onChange(next);
    onAfterPreset(next);
  }

  function confirmDialog() {
    if (!dialog || disabled) return;
    if (dialog.mode === "save") {
      const name = dialog.value.trim();
      if (!name) return;
      const newIndex = customPresets.length;
      setCustomPresets((items) => [...items, { name, model: cloneModelForPreset(model) }]);
      setSelected(`custom:${newIndex}`);
    } else if (dialog.mode === "rename") {
      const name = dialog.value.trim();
      if (!name) return;
      setCustomPresets((items) => items.map((item, i) => i === dialog.index ? { ...item, name } : item));
    } else if (dialog.mode === "delete") {
      setCustomPresets((items) => items.filter((_, i) => i !== dialog.index));
      setSelected("single");
    }
    setDialog(null);
  }

  return <div className="model-preset-controls builder-model-preset-controls xy-builder-presets compact-canvas-presets">
    {onGoToFitting ? <button type="button" className="primary xy-preset-go-fit" disabled={disabled} onClick={onGoToFitting}>{language === "zh" ? "去拟合" : "Go to Fit"}</button> : null}
    {dirty ? <span className="xy-preset-dirty-pill" title={language === "zh" ? "当前模型已修改但尚未保存为预设" : "Current model has unsaved preset changes"}>{language === "zh" ? "已修改" : "Modified"}</span> : null}
    <label className="xy-preset-select-label"><span>{language === "zh" ? "模型" : "Model"}</span><select disabled={disabled} value={selected} onChange={(event) => apply(event.target.value)} data-testid="model-preset-select" aria-label={language === "zh" ? "模型预设" : "Model preset"}>
      <option value="single">{selected === "single" ? presetLabel("single", language, customPresets, dirty) : (language === "zh" ? "单二极管模型" : "Single diode model")}</option>
      <option value="double">{selected === "double" ? presetLabel("double", language, customPresets, dirty) : (language === "zh" ? "双二极管模型" : "Double diode model")}</option>
      {customOptions.map((option) => <option key={option.id} value={option.id}>{selected === option.id ? presetLabel(option.id, language, customPresets, dirty) : option.name}</option>)}
    </select></label>
    <div className="model-preset-actions">
      <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "save", value: language === "zh" ? "自定义模型" : "Custom model" })}>{language === "zh" ? "另存预设" : "Save as preset"}</button>
      {selectedCustom ? <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "rename", value: selectedCustom.name, index: customIndex })}>{language === "zh" ? "重命名" : "Rename"}</button> : null}
      {selectedCustom ? <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "delete", index: customIndex })}>{language === "zh" ? "删除" : "Delete"}</button> : null}
      <button type="button" disabled={disabled} onClick={resetSelectedPreset}>{language === "zh" ? "重置模型" : "Reset model"}</button>
    </div>
    {dialog ? <div className="preset-inline-dialog" role="dialog" aria-modal="false">
      {dialog.mode === "delete" ? <p>{language === "zh" ? `删除预设 ${customPresets[dialog.index]?.name ?? ""}？` : `Delete preset ${customPresets[dialog.index]?.name ?? ""}?`}</p> : <label>
        <span>{dialog.mode === "save" ? (language === "zh" ? "保存为" : "Save as") : (language === "zh" ? "重命名为" : "Rename as")}</span>
        <input
          autoFocus
          value={dialog.value}
          onChange={(event) => setDialog({ ...dialog, value: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") confirmDialog();
            if (event.key === "Escape") setDialog(null);
          }}
        />
      </label>}
      <div className="preset-inline-dialog-actions">
        <button type="button" onClick={confirmDialog}>{language === "zh" ? "确认" : "OK"}</button>
        <button type="button" onClick={() => setDialog(null)}>{language === "zh" ? "取消" : "Cancel"}</button>
      </div>
    </div> : null}
  </div>;
}
