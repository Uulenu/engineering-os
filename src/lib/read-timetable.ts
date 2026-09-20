import { fromCSV, fromMatrix, fromText, ImportRow } from "./import-model";
export type FileResult = {
  rows: ImportRow[];
  text: string;
  previews: string[];
  notice: string;
};
export async function readTimetable(
  file: File,
  progress: (s: string) => void,
): Promise<FileResult> {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Choose a file smaller than 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  const result: FileResult = {
    rows: [],
    text: "",
    previews: [],
    notice:
      "Review every field before saving. Blank credits and uncertain fields need your input.",
  };
  if (ext === "csv") {
    result.text = await file.text();
    result.rows = fromCSV(result.text);
    return result;
  }
  if (ext === "xlsx") {
    const { default: read } = await import("read-excel-file/browser");
    const sheets = await read(file);
    if (sheets.length > 10)
      throw Error("Use a workbook with at most 10 sheets.");
    for (const sheet of sheets) {
      const matrix = sheet.data.map((row) =>
        row.map((v) =>
          v instanceof Date
            ? `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`
            : String(v ?? ""),
        ),
      );
      result.rows.push(...fromMatrix(matrix));
      result.text += `${sheet.sheet}\n${matrix.map((r) => r.join(" | ")).join("\n")}\n`;
    }
    if (result.rows.length > 500)
      throw Error("Use at most 500 rows per import.");
    return result;
  }
  if (!["pdf", "png", "jpg", "jpeg", "webp"].includes(ext || ""))
    throw Error(
      "Choose PNG, JPG, WebP, PDF, CSV or XLSX. Export older Excel files as XLSX.",
    );
  const ocr = async (source: string) => {
    progress("Reading image text… the first scan may take a minute.");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(["eng", "mon"], 1, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr",
      langPath: "/ocr",
      logger: (m) =>
        progress(
          `${m.status}${m.progress ? ` · ${Math.round(m.progress * 100)}%` : ""}`,
        ),
    });
    try {
      return (await worker.recognize(source)).data.text;
    } finally {
      await worker.terminate();
    }
  };
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const doc = await task.promise;
    try {
      if (doc.numPages > 8)
        throw Error(
          "Choose a PDF with at most 8 pages. Export only the timetable pages.",
        );
      for (let i = 1; i <= doc.numPages; i++) {
        progress(`Reading page ${i} of ${doc.numPages}…`);
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let line = "",
          text = "",
          lastY: number | undefined;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = item.transform[5];
          if (lastY !== undefined && Math.abs(y - lastY) > 3) {
            text += line + "\n";
            line = "";
          }
          line += item.str + " ";
          lastY = y;
          if (item.hasEOL) {
            text += line + "\n";
            line = "";
            lastY = undefined;
          }
        }
        text += line;
        const viewport = page.getViewport({
          scale: Math.min(1.8, 1800 / page.getViewport({ scale: 1 }).width),
        });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (canvas.width * canvas.height > 6_000_000)
          throw Error("PDF page is too large. Export a smaller page.");
        await page.render({ canvas, viewport }).promise;
        const preview = canvas.toDataURL("image/png");
        result.previews.push(preview);
        if (text.trim().length < 20) text = await ocr(preview);
        result.text += text + "\n";
        canvas.width = canvas.height = 0;
      }
    } finally {
      await task.destroy();
    }
  } else {
    const image = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const preview = canvas.toDataURL("image/png");
    result.previews.push(preview);
    result.text = await ocr(preview);
    canvas.width = canvas.height = 0;
  }
  result.rows = fromText(result.text);
  if (!result.rows.length)
    result.notice =
      "We could not confidently identify course rows. Your file is shown below: add the courses and times manually, or upload the CSV template. Nothing has been saved.";
  else
    result.notice =
      "Text was extracted, but grid layouts and scans can mix columns. Compare each course, day and time with the original. Nothing is saved until you confirm.";
  return result;
}
