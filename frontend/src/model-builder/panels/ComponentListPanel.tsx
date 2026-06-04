import type { Mb3ComponentTemplate } from "../domain/templates";

export function ComponentListPanel({
  templates,
  usageByTemplateKey,
  onSelectTemplate,
  onDeleteTemplate,
  embedded = false,
}: {
  templates: Mb3ComponentTemplate[];
  usageByTemplateKey: Map<string, number>;
  onSelectTemplate: (template: Mb3ComponentTemplate, anchor: DOMRect) => void;
  onDeleteTemplate?: (template: Mb3ComponentTemplate) => void;
  embedded?: boolean;
}) {
  return (
    <aside
      className={embedded ? "mbv3-component-list-panel" : "mbv3-component-list-float"}
      aria-label="Component functions"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <strong>Components</strong>
      <div className="mbv3-component-list">
        {templates.map((template) => {
          const count = usageByTemplateKey.get(template.key) ?? 0;
          return (
            <div
              className={
                template.userDefined
                  ? "mbv3-component-item mbv3-component-item-saved"
                  : "mbv3-component-item"
              }
              key={template.key}
            >
              <button
                className="mbv3-component-select"
                type="button"
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData("application/x-mb3-component-template", template.key);
                  event.dataTransfer.setData("text/plain", template.key);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectTemplate(template, event.currentTarget.getBoundingClientRect());
                }}
              >
                <span>{template.label}</span>
                <small>{count > 0 ? `${count} added` : "not added"}</small>
              </button>
              {template.userDefined && onDeleteTemplate ? (
                <button
                  className="mbv3-component-template-delete"
                  type="button"
                  aria-label={`Delete ${template.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTemplate(template);
                  }}
                >
                  x
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
