import * as Child from "node:child_process";
import * as Files from "node:fs/promises";
import * as Path from "node:path";
import * as Util from "node:util";
import { resultify } from "@zenncore/utils";

const execute = Util.promisify(Child.execFile);

const part = async ({ output, images, library, sharp, date, destination }) => {
  const document = await library.PDFDocument.create();
  const font = await document.embedFont(library.StandardFonts.Helvetica);
  for (const entry of images) {
    const file = Path.join(output, entry.file);
    const options = entry.image
      ? { limitInputPixels: entry.image.width * entry.image.height }
      : {};
    const metadata = await sharp(file, options).metadata();
    const scale = Math.min(0.5, 14000 / (metadata.height + 60));
    const width = metadata.width * scale;
    const height = metadata.height * scale;
    const page = document.addPage([width, height + 34]);
    const image = await document.embedJpg(
      await sharp(file, options)
        .resize({
          height: Math.min(metadata.height, 60000),
          withoutEnlargement: true,
        })
        .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
        .toBuffer(),
    );
    page.drawImage(image, { x: 0, y: 0, width, height });
    const viewport = entry.device?.viewport;
    const captured = entry.captured
      ? new Date(entry.captured).toLocaleDateString("en-CA", {
          timeZone: "America/Los_Angeles",
        })
      : date;
    const dimensions = viewport
      ? `${viewport.width} x ${viewport.height} @${entry.device.deviceScaleFactor}`
      : `${metadata.width} x ${metadata.height} px`;
    const text =
      `${entry.number} | ${entry.route} | ${entry.title} | ${entry.mode} ${dimensions} | ${captured}`.replace(
        /[^\x20-\x7e\xa0-\xff]/g,
        "-",
      );
    const size = Math.min(9, (width - 20) / font.widthOfTextAtSize(text, 1));
    page.drawText(text, { x: 10, y: height + 12, size, font });
  }
  await Files.writeFile(destination, await document.save());
};

export const write = async ({
  output,
  entries,
  menus,
  library,
  sharp,
  date,
  merger = "pdfunite",
}) => {
  if (!library) throw new Error("pdf-lib is required to write review.pdf");
  const images = [
    ...entries.map((entry) => ({ ...entry, file: `screens/${entry.file}` })),
    ...menus
      .filter((entry) => entry.file)
      .map((entry, index) => ({
        ...entry,
        number: `M${String(index + 1).padStart(2, "0")}`,
        route: entry.route ?? entry.name,
        title: entry.title ?? entry.name,
        file: `screens/menus/${entry.file}`,
      })),
  ];
  const chunks = Array.from(
    { length: Math.ceil(images.length / 12) },
    (_, index) => images.slice(index * 12, index * 12 + 12),
  );
  if (!chunks.length)
    throw new Error("No screenshots are available for review.pdf");
  if (chunks.length > 1) {
    const available = await resultify(() => execute(merger, ["-v"]));
    if (!available.success)
      throw new Error(
        `Large packs require Poppler pdfunite; pass --pdfunite PATH. ${available.error.message}`,
      );
  }
  const directory = Path.join(output, ".pdf-parts");
  await Files.mkdir(directory, { recursive: true });
  const parts = [];
  for (const [index, images] of chunks.entries()) {
    const destination = Path.join(
      directory,
      `${String(index + 1).padStart(3, "0")}.pdf`,
    );
    console.log(
      `PDF part ${index + 1}/${chunks.length}: ${images.length} screenshots`,
    );
    await part({ output, images, library, sharp, date, destination });
    parts.push(destination);
  }
  const temporary = Path.join(output, "review.pdf.pending");
  if (parts.length === 1) await Files.copyFile(parts[0], temporary);
  else
    await execute(merger, [...parts, temporary], {
      maxBuffer: 4 * 1024 * 1024,
    });
  const information = await resultify(() => execute("pdfinfo", [temporary]));
  const pages = information.success
    ? Number(information.data.stdout.match(/^Pages:\s+(\d+)/m)?.[1])
    : null;
  if (pages !== null && pages !== images.length)
    throw new Error(
      `PDF page count mismatch: expected ${images.length}, found ${pages}`,
    );
  await Files.rename(temporary, Path.join(output, "review.pdf"));
  await Files.writeFile(
    Path.join(output, "pdf-verification.json"),
    JSON.stringify(
      {
        screenshots: images.length,
        pages,
        parts: chunks.length,
        assembly:
          chunks.length > 1
            ? "12-page pdf-lib batches merged by pdfunite"
            : "pdf-lib",
        infoAvailable: information.success,
      },
      null,
      2,
    ),
  );
  await Files.rm(directory, { recursive: true });
  return images.length;
};
