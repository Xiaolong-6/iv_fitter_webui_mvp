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

export function ModelPresetControls({ model, language, onChange, disabled, onAfterPreset, onResetModel, onGoToFitting }: {
  model: ModelSpec;
  language: Language;
  onChange: (model: ModelSpec) => void;
  disabled?: boolean;
  onAfterPreset: (model: ModelSpec) => void;
  onResetModel?: () => void;
  onGoToFitting?: () => void;
}) {
  const [customPresets, setCustomPresets] = useState<BuilderPreset[]>(() => typeof window === "undefined" ? [] : readBuilderPresets());
  const [selected, setSelected] = useState("single");
  const [dialog, setDialog] = useState<PresetDialog>(null);
  const customOptions = useMemo(() => customPresets.map((preset, index) => ({ id: `custom:${index}`, name: preset.name })), [customPresets]);
  const customIndex = selected.startsWith("custom:") ? Number(selected.split(":")[1]) : -1;
  const selectedCustom = customIndex >= 0 ? customPresets[customIndex] : null;

  useEffect(() => { if (typeof window !== "undefined") writeBuilderPresets(customPresets); }, [customPresets]);

  function apply(value: string) {
    setSelected(value);
    if (disabled) return;
    let next: ModelSpec | null = null;
    if (value === "single") next = makeSingleDiodePreset(model);
    else if (value === "double") next = makeDoubleDiodePreset(model);
    else if (value.startsWith("custom:")) {
      const preset = customPresets[Number(value.split(":")[1])];
      if (preset) next = cloneModelForPreset(preset.model);
    }
    if (next) {
      onChange(next);
      onAfterPreset(next);
    }
  }

  function confirmDialog() {
    if (!dialog || disabled) return;
    if (dialog.mode === "save") {
      const name = dialog.value.trim();
      if (!name) return;
      setCustomPresets((items) => [...items, { name, model: cloneModelForPreset(model) }]);
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
    <label className="xy-preset-select-label"><span>{language === "zh" ? "预设" : "Preset"}</span><select disabled={disabled} value={selected} onChange={(event) => apply(event.target.value)} data-testid="model-preset-select"><option value="single">{language === "zh" ? "单二极管模型" : "Single diode model"}</option><option value="double">{language === "zh" ? "双二极管模型" : "Double diode model"}</option>{customOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
    <div className="model-preset-actions">
      <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "save", value: language === "zh" ? "自定义模型" : "Custom model" })}>{language === "zh" ? "保存" : "Save"}</button>
      {selectedCustom ? <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "rename", value: selectedCustom.name, index: customIndex })}>{language === "zh" ? "重命名" : "Rename"}</button> : null}
      {selectedCustom ? <button type="button" disabled={disabled} onClick={() => setDialog({ mode: "delete", index: customIndex })}>−</button> : null}
      <button type="button" disabled={disabled} onClick={onResetModel}>{language === "zh" ? "重置" : "Reset"}</button>
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
