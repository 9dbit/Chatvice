import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

let pdfParse: any = null;

async function loadPdfParse() {
  if (!pdfParse) {
    try {
      const module = await import('pdf-parse');
      pdfParse = module.default || module;
    } catch (e) {
      console.error('Failed to load pdf-parse:', e);
    }
  }
  return pdfParse;
}

export interface ParseResult {
  success: boolean;
  content: string;
  error?: string;
}

export async function parseFile(filePath: string, mimeType: string): Promise<ParseResult> {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      return await parsePDF(buffer);
    }
    
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDocx(buffer);
    }
    
    if (ext === '.doc' || mimeType === 'application/msword') {
      return { success: false, content: '', error: 'Old .doc format not supported. Please convert to .docx' };
    }
    
    if (ext === '.xlsx' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return await parseXlsx(buffer);
    }
    
    if (ext === '.xls' || mimeType === 'application/vnd.ms-excel') {
      return await parseXlsx(buffer);
    }
    
    if (['.txt', '.md', '.csv', '.json', '.xml', '.html'].includes(ext)) {
      return { success: true, content: buffer.toString('utf-8') };
    }
    
    return { success: false, content: '', error: `Unsupported file type: ${ext}` };
  } catch (error: any) {
    console.error('File parsing error:', error);
    return { success: false, content: '', error: error.message || 'Failed to parse file' };
  }
}

async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const parser = await loadPdfParse();
    if (!parser) {
      return { success: false, content: '', error: 'PDF parser not available' };
    }
    
    const data = await parser(buffer);
    const content = data.text.trim();
    
    if (!content) {
      return { success: false, content: '', error: 'PDF appears to be empty or image-based (no extractable text)' };
    }
    
    return { success: true, content };
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return { success: false, content: '', error: 'Failed to parse PDF. It may be corrupted or password-protected.' };
  }
}

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value.trim();
    
    if (!content) {
      return { success: false, content: '', error: 'Word document appears to be empty' };
    }
    
    return { success: true, content };
  } catch (error: any) {
    console.error('DOCX parsing error:', error);
    return { success: false, content: '', error: 'Failed to parse Word document' };
  }
}

async function parseXlsx(buffer: Buffer): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const allContent: string[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length > 0) {
        allContent.push(`--- Sheet: ${sheetName} ---`);
        
        for (const row of jsonData) {
          if (row.some(cell => cell !== undefined && cell !== null && cell !== '')) {
            const rowText = row.map(cell => {
              if (cell === undefined || cell === null) return '';
              return String(cell).trim();
            }).join(' | ');
            allContent.push(rowText);
          }
        }
        allContent.push('');
      }
    }
    
    const content = allContent.join('\n').trim();
    
    if (!content) {
      return { success: false, content: '', error: 'Excel file appears to be empty' };
    }
    
    return { success: true, content };
  } catch (error: any) {
    console.error('XLSX parsing error:', error);
    return { success: false, content: '', error: 'Failed to parse Excel file' };
  }
}

export async function fetchGoogleDoc(url: string): Promise<ParseResult> {
  try {
    const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!docIdMatch) {
      return { success: false, content: '', error: 'Invalid Google Docs URL' };
    }
    
    const docId = docIdMatch[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, content: '', error: 'Google Doc is not publicly accessible. Please set sharing to "Anyone with the link can view"' };
      }
      return { success: false, content: '', error: `Failed to fetch Google Doc: ${response.status}` };
    }
    
    const content = await response.text();
    return { success: true, content: content.trim() };
  } catch (error: any) {
    console.error('Google Docs fetch error:', error);
    return { success: false, content: '', error: 'Failed to fetch Google Doc' };
  }
}

export async function fetchGoogleSheet(url: string): Promise<ParseResult> {
  try {
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!sheetIdMatch) {
      return { success: false, content: '', error: 'Invalid Google Sheets URL' };
    }
    
    const sheetId = sheetIdMatch[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, content: '', error: 'Google Sheet is not publicly accessible. Please set sharing to "Anyone with the link can view"' };
      }
      return { success: false, content: '', error: `Failed to fetch Google Sheet: ${response.status}` };
    }
    
    const csvContent = await response.text();
    
    const lines = csvContent.split('\n');
    const formattedLines = lines.map(line => {
      const cells = line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
      return cells.join(' | ');
    });
    
    return { success: true, content: formattedLines.join('\n').trim() };
  } catch (error: any) {
    console.error('Google Sheets fetch error:', error);
    return { success: false, content: '', error: 'Failed to fetch Google Sheet' };
  }
}
