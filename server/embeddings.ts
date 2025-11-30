import OpenAI from "openai";
import { storage } from "./storage";
import type { KnowledgeChunk } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || undefined,
});

function splitIntoChunks(content: string, maxChunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    if (currentChunk.length + trimmed.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  if (chunks.length === 0 && content.trim()) {
    chunks.push(content.trim().slice(0, maxChunkSize));
  }
  
  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function processKnowledgeBase(merchantId: string, content: string, agentId?: string): Promise<void> {
  await storage.deleteKnowledgeChunks(merchantId, agentId);
  
  const chunks = splitIntoChunks(content);
  
  for (const chunkContent of chunks) {
    const chunk = await storage.createKnowledgeChunk({
      merchantId,
      agentId,
      content: chunkContent,
    });
    
    try {
      const embedding = await generateEmbedding(chunkContent);
      await storage.updateChunkEmbedding(chunk.id, JSON.stringify(embedding));
    } catch (error) {
      console.error("Error processing chunk embedding:", error);
    }
  }
}

export async function searchKnowledge(
  merchantId: string,
  query: string,
  topK: number = 3,
  agentId?: string
): Promise<string[]> {
  const chunks = await storage.getKnowledgeChunks(merchantId, agentId);
  
  if (chunks.length === 0) {
    return [];
  }
  
  const chunksWithEmbeddings = chunks.filter(c => c.embedding);
  
  if (chunksWithEmbeddings.length === 0) {
    return chunks.slice(0, topK).map(c => c.content);
  }
  
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    const scored = chunksWithEmbeddings.map(chunk => {
      const chunkEmbedding = JSON.parse(chunk.embedding!) as number[];
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return { chunk, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    const topChunks = scored.slice(0, topK);
    const relevantChunks = topChunks.filter(s => s.score > 0.3);
    
    if (relevantChunks.length === 0 && topChunks.length > 0) {
      return topChunks.slice(0, 1).map(s => s.chunk.content);
    }
    
    return relevantChunks.map(s => s.chunk.content);
  } catch (error) {
    console.error("Error searching knowledge:", error);
    return chunks.slice(0, topK).map(c => c.content);
  }
}

export async function hasProcessedEmbeddings(merchantId: string): Promise<boolean> {
  const chunks = await storage.getKnowledgeChunks(merchantId);
  return chunks.length > 0 && chunks.some(c => c.embedding !== null);
}
