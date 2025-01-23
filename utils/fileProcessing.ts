// utils/fileProcessing.ts
import * as pdfjs from 'pdfjs-dist';
import { Mistral } from '@mistralai/mistralai';

export async function processTextFile(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

export async function processPDFFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(' ') + '\n';
  }
  
  return text;
}

export const createEmbeddings = async (text: string) => {
  try {
    const client = new Mistral({apiKey: process.env.NEXT_PUBLIC_MISTRAL_API_KEY || ''});

    const embeddingResponse = await client.embeddings.create({
      model: 'mistral-embed',
      inputs: [text]
    });

    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Embedding creation error:', error);
    throw error;
  }
};

export function splitIntoChunks(text: string, maxChunkSize: number = 512): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}