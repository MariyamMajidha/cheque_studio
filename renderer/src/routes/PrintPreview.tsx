// renderer/src/routes/PrintPreview.tsx
import React from "react";
import PreviewCanvas from "../canvas/PreviewCanvas";

type Payload = {
  template: any;
  cheques: any[];
  offsets: { x: number; y: number };
};

export default function PrintPreview() {
  const [data, setData] = React.useState<Payload | null>(null);

  React.useEffect(() => {
    // subscribe to payload from main
    const off = window.api.print.onPayload((p: Payload) => setData(p));
    // tell main we’re ready to receive
    window.api.print.ready();
    return () => off();
  }, []);

  if (!data) {
    return <div className="p-4 text-gray-600">Preparing preview…</div>;
  }

  const doPrint = async () => {
    // Ask main to print this window (no args means “current sender”)
    await window.api.print.run(undefined as any);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Print Preview</h2>
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={doPrint}
        >
          Print
        </button>
      </div>

      <PreviewCanvas
        template={data.template}
        cheques={data.cheques}
        offsets={data.offsets}
      />
    </div>
  );
}
