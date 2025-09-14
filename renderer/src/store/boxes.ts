// path: renderer/src/store/boxes.ts
import React from "react";

export function useBoxes(templateId: number) {
  const [boxes, setBoxes] = React.useState<any[]>([]);
  const load = React.useCallback(async () => {
    const b = await window.api.invoke<any[]>("boxes:list", templateId);
    setBoxes(b);
  }, [templateId]);

  const save = React.useCallback(async () => {
    await window.api.invoke("boxes:upsertMany", { templateId, boxes });
    alert("Saved");
  }, [templateId, boxes]);

  return { boxes, setBoxes, load, save };
}
