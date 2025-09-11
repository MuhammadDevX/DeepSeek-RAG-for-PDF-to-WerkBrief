import { Pinecone } from '@pinecone-database/pinecone';
import { getEnvOrThrow } from '@/lib/utils';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

export interface PineconeDocument {
  id: string;
  content: string;
  metadata: {
    desc: string;
    code: string;
    gdesc: string;
    category: string;
  };
}

export interface UploadResult {
  success: boolean;
  message: string;
  uploadedCount?: number;
  error?: string;
}

export async function uploadToPinecone(documents: PineconeDocument[]): Promise<UploadResult> {
  try {
    const pc = new Pinecone({ apiKey: getEnvOrThrow('PINECONE_API_KEY') });
    const indexName = getEnvOrThrow('PINECONE_INDEX');

    // Get or create index
    const index = pc.Index(indexName);

    // Process documents in batches
    const batchSize = 10;
    let uploadedCount = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      // Generate embeddings for the batch
      const embeddings = await Promise.all(
        batch.map(async (doc) => {
          const { embedding } = await embed({
            model: openai.embedding('text-embedding-ada-002'),
            value: doc.content,
          });
          return {
            id: doc.id,
            values: embedding,
            metadata: doc.metadata
          };
        })
      );

      // Upload to Pinecone
      await index.upsert(embeddings);
      uploadedCount += batch.length;

      console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
    }

    return {
      success: true,
      message: `Successfully uploaded ${uploadedCount} documents to Pinecone`,
      uploadedCount
    };

  } catch (error) {
    console.error('Error uploading to Pinecone:', error);
    return {
      success: false,
      message: 'Failed to upload to Pinecone',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testPineconeConnection(): Promise<boolean> {
  try {
    const pc = new Pinecone({ apiKey: getEnvOrThrow('PINECONE_API_KEY') });
    const indexName = getEnvOrThrow('PINECONE_INDEX');
    const index = pc.Index(indexName);

    // Try to query the index to test connection
    await index.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 1,
      includeMetadata: false
    });

    return true;
  } catch (error) {
    console.error('Pinecone connection test failed:', error);
    return false;
  }
}
