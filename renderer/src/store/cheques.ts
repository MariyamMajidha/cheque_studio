// path: renderer/src/store/cheques.ts
import React from "react";

export function useChequesByIds(templateId: number, ids: number[]) {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => {
    window.api.invoke<any[]>("cheques:list", { template_id: templateId }).then(all => {
      setRows(all.filter(a => ids.includes(a.id)));
    });
  }, [templateId, JSON.stringify(ids)]);
  return rows;
}
