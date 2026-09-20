import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fromCSV,
  fromText,
  importPayload,
  validateImport,
  mergeImportRows,
  blankRow,
} from "../src/lib/import-model";
test("CSV respects quoted names, multiple meetings, any major and Saturday classes", () => {
  const rows = fromCSV(
    'code,name,credits,priority,day,start_time,end_time,room,type\nART101,"Art, culture and design",3,2,Saturday,9:00,10:30,204,Seminar\nART101,"Art, culture and design",3,2,Monday,11:00,12:30,204,Lecture',
  );
  assert.deepEqual(validateImport(rows), []);
  assert.equal(importPayload(rows).length, 1);
  assert.equal(importPayload(rows)[0].meetings.length, 2);
  assert.equal(rows[0].day, "6");
});
test("duplicates, inconsistent metadata, and invalid times cannot be imported", () => {
  const rows = fromCSV(
    "code,name,credits,priority,day,start_time,end_time\nMED101,Anatomy,4,1,Monday,10:00,11:00",
  );
  assert.match(validateImport([...rows, ...rows]).join(" "), /duplicate/);
  assert.match(
    validateImport([{ ...rows[0], end_time: "09:00" }]).join(" "),
    /valid start/,
  );
  assert.match(
    validateImport([{ ...rows[0], credits: "" }]).join(" "),
    /credits/,
  );
});
test("OCR leaves uncertain credits and days blank instead of inventing a plan", () => {
  const rows = fromText("ART101 Visual Design 3 credits 09:00 - 10:30");
  assert.equal(rows[0].day, "");
  assert.equal(rows[0].credits, "");
  assert.ok(validateImport(rows).length);
});
test("Mongolian headers and weekday names are understood", () => {
  const rows = fromCSV(
    "код,хичээлийн нэр,кредит,гараг,эхлэх,дуусах\nMON101,Монгол хэл,3,Даваа,09:00,10:30",
  );
  assert.equal(rows[0].day, "1");
  assert.equal(rows[0].name, "Монгол хэл");
});

test("separate course lists fill missing schedule metadata without hiding conflicts", () => {
  const course = {
    ...blankRow(),
    code: "ART101",
    name: "Visual art",
    credits: "3",
  };
  const meeting = {
    ...blankRow(),
    code: "ART101",
    day: "1",
    start_time: "09:00",
    end_time: "10:30",
  };
  const rows = mergeImportRows([course, meeting]);
  assert.equal(rows[1].name, "Visual art");
  assert.equal(rows[1].credits, "3");
  assert.deepEqual(validateImport(rows), []);
  const conflicting = mergeImportRows([
    course,
    { ...meeting, name: "Wrong title", credits: "4" },
  ]);
  assert.match(validateImport(conflicting).join(" "), /same name/);
});
