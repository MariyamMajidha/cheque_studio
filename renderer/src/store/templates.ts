// path: renderer/src/store/templates.ts
import React from "react";

export function useTemplate(id: number) {
  const [t, setT] = React.useState<any | null>(null);
  React.useEffect(() => {
    window.api.invoke("templates:get", id).then(setT);
  }, [id]);
  return t;
}
