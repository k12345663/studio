import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export async function createChatCompletion(
  messages: OpenAIMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }
) {
  try {
    const response = await openai.chat.completions.create({
      model: options?.model || DEFAULT_MODEL,
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 4000,
      response_format: options?.responseFormat,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createSystemMessage(content: string): OpenAIMessage {
  return {
    role: 'system',
    content,
  };
}

export function createUserMessage(content: string): OpenAIMessage {
  return {
    role: 'user',
    content,
  };
}

export function createUserMessageWithImage(text: string, imageDataUri: string): OpenAIMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text,
      },
      {
        type: 'image_url',
        image_url: {
          url: imageDataUri,
          detail: 'high',
        },
      },
    ],
  };
}