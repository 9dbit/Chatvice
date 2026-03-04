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
  metadata?: {
    pageCount?: number;
    sheetCount?: number;
    wordCount?: number;
    charCount?: number;
    lineCount?: number;
    fileType?: string;
    summary?: string;
  };
}

function detectLanguage(text: string): 'id' | 'en' | 'other' {
  // Simple language detection based on common words
  const indonesianWords = ['dan', 'yang', 'untuk', 'dengan', 'ini', 'dari', 'adalah', 'atau', 'pada', 'ke', 'di', 'tidak', 'akan', 'juga', 'sudah', 'bisa', 'ada', 'itu', 'dapat', 'telah', 'oleh', 'sebagai', 'dalam', 'karena', 'harus', 'saya', 'kami', 'kita', 'mereka', 'anda'];
  const englishWords = ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'with', 'from', 'for', 'not', 'but', 'what', 'which', 'when', 'where', 'who', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such'];
  
  const words = text.toLowerCase().split(/\s+/).slice(0, 200);
  let idCount = 0;
  let enCount = 0;
  
  for (const word of words) {
    if (indonesianWords.includes(word)) idCount++;
    if (englishWords.includes(word)) enCount++;
  }
  
  if (idCount > enCount && idCount >= 3) return 'id';
  if (enCount > idCount && enCount >= 3) return 'en';
  return 'other';
}

function generateSummary(content: string, fileType: string): string {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const firstFewLines = lines.slice(0, 5).join(' ').substring(0, 200);
  const lang = detectLanguage(content);
  
  // Multi-language labels
  const labels = {
    id: {
      tableData: 'Data tabel dengan',
      rows: 'baris',
      preview: 'Preview',
      pdfDoc: 'Dokumen PDF',
      textDoc: 'Dokumen teks',
      file: 'File'
    },
    en: {
      tableData: 'Table data with',
      rows: 'rows',
      preview: 'Preview',
      pdfDoc: 'PDF Document',
      textDoc: 'Text document',
      file: 'File'
    },
    other: {
      tableData: 'Table data with',
      rows: 'rows',
      preview: 'Preview',
      pdfDoc: 'PDF Document',
      textDoc: 'Text document',
      file: 'File'
    }
  };
  
  const l = labels[lang];
  
  if (fileType === 'Excel' || fileType === 'CSV' || fileType === 'Google Sheet') {
    const tableRows = lines.length;
    return `${l.tableData} ${tableRows} ${l.rows}. ${l.preview}: ${firstFewLines}...`;
  }
  
  if (fileType === 'PDF') {
    return `${l.pdfDoc}. ${l.preview}: ${firstFewLines}...`;
  }
  
  if (fileType === 'Word' || fileType === 'Google Doc') {
    return `${l.textDoc}. ${l.preview}: ${firstFewLines}...`;
  }
  
  return `${l.file} ${fileType}. ${l.preview}: ${firstFewLines}...`;
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
      const content = buffer.toString('utf-8');
      const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
      const lineCount = content.split('\n').length;
      const fileType = ext === '.csv' ? 'CSV' : ext === '.txt' ? 'Text' : ext.toUpperCase().replace('.', '');
      const summary = generateSummary(content, fileType);
      
      return { 
        success: true, 
        content,
        metadata: {
          wordCount,
          charCount: content.length,
          lineCount,
          fileType,
          summary
        }
      };
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
    
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lineCount = content.split('\n').length;
    const summary = generateSummary(content, 'PDF');
    
    return { 
      success: true, 
      content,
      metadata: {
        pageCount: data.numpages || 1,
        wordCount,
        charCount: content.length,
        lineCount,
        fileType: 'PDF',
        summary
      }
    };
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
    
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lineCount = content.split('\n').length;
    const paragraphs = content.split('\n\n').length;
    const summary = generateSummary(content, 'Word');
    
    return { 
      success: true, 
      content,
      metadata: {
        pageCount: Math.ceil(paragraphs / 3),
        wordCount,
        charCount: content.length,
        lineCount,
        fileType: 'Word',
        summary
      }
    };
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
    
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lineCount = content.split('\n').length;
    const summary = generateSummary(content, 'Excel');
    
    return { 
      success: true, 
      content,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        wordCount,
        charCount: content.length,
        lineCount,
        fileType: 'Excel',
        summary
      }
    };
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
    
    const content = (await response.text()).trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lineCount = content.split('\n').length;
    const summary = generateSummary(content, 'Google Doc');
    
    return { 
      success: true, 
      content,
      metadata: {
        wordCount,
        charCount: content.length,
        lineCount,
        fileType: 'Google Doc',
        summary
      }
    };
  } catch (error: any) {
    console.error('Google Docs fetch error:', error);
    return { success: false, content: '', error: 'Failed to fetch Google Doc' };
  }
}

function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        cells.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}

function splitCSVLines(csv: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += '""';
          i++;
        } else {
          inQuotes = false;
          current += char;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        current += char;
      } else if (char === '\n') {
        lines.push(current);
        current = '';
      } else if (char === '\r') {
        if (i + 1 < csv.length && csv[i + 1] === '\n') {
          i++;
        }
        lines.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
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
    
    const lines = splitCSVLines(csvContent).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { success: false, content: '', error: 'Google Sheet appears to be empty' };
    }

    const headers = parseCSVRow(lines[0]);
    const outputLines: string[] = [];

    outputLines.push('[Google Sheet Data]');
    outputLines.push(`Headers: ${headers.join(', ')}`);

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVRow(lines[i]);
      if (cells.every(c => c === '')) continue;

      const labeledCells = headers.map((header, idx) => {
        const value = idx < cells.length ? cells[idx] : '';
        return `${header}=${value}`;
      });
      outputLines.push(`Row ${i}: ${labeledCells.join(', ')}`);
    }
    
    const content = outputLines.join('\n').trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const dataRowCount = lines.length - 1;
    const summary = generateSummary(content, 'Google Sheet');
    
    return { 
      success: true, 
      content,
      metadata: {
        lineCount: dataRowCount,
        wordCount,
        charCount: content.length,
        fileType: 'Google Sheet',
        summary
      }
    };
  } catch (error: any) {
    console.error('Google Sheets fetch error:', error);
    return { success: false, content: '', error: 'Failed to fetch Google Sheet' };
  }
}
