
'use server';

// import pdf from 'pdf-parse'; // Original static import

export async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = (await import('pdf-parse')).default; // Dynamically import pdf-parse
    const buffer = Buffer.from(fileBuffer);
    const data = await pdf(buffer);
    if (!data.text || data.text.trim() === '') {
        throw new Error('No text found in PDF or PDF is empty.');
    }
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    if (error instanceof Error && error.message.includes('No text found')) {
        throw error;
    }
    throw new Error('Failed to extract text from PDF. The file might be corrupted or in an unsupported format.');
  }
}
