// components/FileHandler.tsx
import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { processTextFile, processPDFFile, createEmbeddings, splitIntoChunks } from '@/utils/fileProcessing';

interface FileHandlerProps {
  sessionId: string | null;
  onFileProcessed: () => void;
}

interface EmbeddingData {
  file_id: string;
  session_id: string;
  content: string;
  embedding: number[];
}

export function FileHandler({ sessionId, onFileProcessed }: FileHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sessionId) return;

    setIsProcessing(true);
    try {
      let text: string;
      if (file.type === 'text/plain') {
        text = await processTextFile(file);
      } else if (file.type === 'application/pdf') {
        text = await processPDFFile(file);
      } else {
        throw new Error('Unsupported file type');
      }

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          session_id: sessionId,
          file_name: file.name,
          file_type: file.type
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const chunks = splitIntoChunks(text);
      const embeddingPromises = chunks.map(async (chunk: string) => {
        const embedding = await createEmbeddings(chunk);
        return {
          file_id: fileData.id,
          session_id: sessionId,
          content: chunk,
          embedding
        } as EmbeddingData;
      });

      const embeddings = await Promise.all(embeddingPromises);

      const { error: embeddingError } = await supabase
        .from('embeddings')
        .insert(embeddings);

      if (embeddingError) throw embeddingError;

      onFileProcessed();
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <label htmlFor="file-upload" className="ml-2">
      <Input
        id="file-upload"
        type="file"
        className="hidden"
        accept=".txt,.pdf"
        onChange={handleFileUpload}
        disabled={isProcessing || !sessionId}
      />
      <Button variant="outline" className="h-full" asChild disabled={isProcessing || !sessionId}>
        <span>
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </span>
      </Button>
    </label>
  );
}