import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

// Load dynamically at runtime so Next.js/Webpack does not try to statically bundle the native binary
const ffmpegInstaller = eval("require")('@ffmpeg-installer/ffmpeg');

function findFileRecursively(dir: string, cleanName: string): string | null {
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        const found = findFileRecursively(fullPath, cleanName);
        if (found) return found;
      } else {
        // Match if the filename contains the clean name
        if (file.toLowerCase().includes(cleanName.toLowerCase())) {
          return fullPath;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Extracts the exact duration of a local media file in seconds using ffmpeg.
 * Falls back to 30 seconds if the file is remote, missing, or fails to parse.
 */
export function getMediaDuration(fileUrl: string): Promise<number> {
  return new Promise((resolve) => {
    if (!fileUrl) {
      return resolve(30);
    }

    // Decode URL characters (e.g., %20 to spaces)
    const decodedUrl = decodeURIComponent(fileUrl);

    // Extract relative path starting with /uploads
    let relativePath = decodedUrl;
    if (decodedUrl.includes('/uploads/')) {
      relativePath = decodedUrl.slice(decodedUrl.indexOf('/uploads/'));
    }

    // Fallback for remote URLs that aren't hosted locally
    if (relativePath.startsWith('http') && !relativePath.includes('localhost') && !relativePath.includes('127.0.0.1')) {
      return resolve(30);
    }

    // Remove any query strings (like timestamps)
    if (relativePath.includes('?')) {
      relativePath = relativePath.split('?')[0];
    }

    let localFilePath = path.join(process.cwd(), relativePath);

    // Fallback: If the file does not exist at the direct path (common in local mismatching database dumps),
    // search recursively in the uploads folder by matching the filename (ignoring UUID prefixes)
    if (!fs.existsSync(localFilePath)) {
      const baseName = path.basename(relativePath);
      // Strip any UUID prefix (e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-)
      const cleanName = baseName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const foundPath = findFileRecursively(uploadsDir, cleanName);
      
      if (foundPath) {
        console.log(`[MediaDuration] Direct path mismatch, fallback found: ${foundPath}`);
        localFilePath = foundPath;
      } else {
        console.warn(`[MediaDuration] File not found locally: ${localFilePath}`);
        return resolve(30);
      }
    }

    execFile(ffmpegInstaller.path, ['-i', localFilePath], (error, stdout, stderr) => {
      const output = stderr || stdout || '';
      const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        return resolve(totalSeconds > 0 ? totalSeconds : 30);
      }
      resolve(30);
    });
  });
}
