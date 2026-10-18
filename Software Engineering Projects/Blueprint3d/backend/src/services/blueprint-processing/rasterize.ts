import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
/** PDF -> PNG via poppler-utils' pdftoppm, first page only, at a DPI good
* enough for line/text detection without being unreasonably large. */
export async function rasterizePdf(pdfPath: string, outputDir: string): Promise<string> {
  const outputPrefix = path.join(outputDir, path.parse(pdfPath).name);
  try {
    await execFileAsync(process.env.PDFTOPPM_BIN??'pdftoppm', ['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', pdfPath, outputPrefix], {windowsHide:true,timeout:60000});
  } catch(error) {
    throw new Error('Could not read the first PDF page. Install Poppler and set PDFTOPPM_BIN, or upload that page as PNG. '+(error as Error).message);
  }
  return `${outputPrefix}.png`;
}
