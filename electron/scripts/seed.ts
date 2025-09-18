// path: electron/scripts/seed.ts
import { getDb } from '../db/connection';
import { Field } from '../../shared/constants';

const db = getDb();

// Create a basic Maldivian cheque template with 6–8 boxes
const tStmt = db.prepare(
  `INSERT INTO templates(name,width_mm,height_mm,dpi,orientation,margin_mm,background_path)
   VALUES(?,?,?,?,?,?,?)`
);
const res = tStmt.run(
  'MDV Cheque A5',
  210, // width A5 landscape-ish
  99,
  300,
  'Landscape',
  5,
  null
);
const templateId = Number(res.lastInsertRowid);

const boxes = [
  { label: 'Payee', field: Field.PayeeName, x: 40, y: 28, w: 120, h: 10, align: 'left' },
  { label: 'Amount Words', field: Field.AmountWords, x: 20, y: 42, w: 170, h: 12, align: 'left' },
  {
    label: 'Amount Numeric',
    field: Field.AmountNumeric,
    x: 155,
    y: 28,
    w: 35,
    h: 10,
    align: 'right'
  },
  { label: 'Date', field: Field.Date, x: 160, y: 12, w: 30, h: 8, align: 'center' }
];

const ins = db.prepare(
  `INSERT INTO template_boxes(template_id,label,mapped_field,x_mm,y_mm,w_mm,h_mm,font_family,font_size,bold,italic,align,uppercase,letter_spacing,line_height,color,rotation,locked,z_index)
   VALUES(@template_id,@label,@mapped_field,@x_mm,@y_mm,@w_mm,@h_mm,'Arial',10,0,0,@align,0,0,1.2,'#000000',0,0,@z_index)`
);

const tx = db.transaction(() => {
  boxes.forEach((b, i) =>
    ins.run({
      template_id: templateId,
      label: b.label,
      mapped_field: b.field,
      x_mm: b.x,
      y_mm: b.y,
      w_mm: b.w,
      h_mm: b.h,
      align: b.align,
      z_index: i
    })
  );
});
tx();

console.log('Seeded template id:', templateId);
