/**
 * AI Service Utility for Question Generation
 * 
 * This utility provides functions to interact with various AI APIs for generating
 * educational questions from textbook content.
 */

import { OpenAI } from 'openai';
// Import mock by default - don't use the pdf-parse module directly
// import mockPdfParse from './mock-pdf-parse'; // Keep commented if mock is not the primary path
// Import these modules dynamically only on the server side
// import pdfParse from 'pdf-parse'; // MOVED to pdf-parser-server.ts
// import https from 'https'; // MOVED to pdf-parser-server.ts

// Add interfaces for AI provider classes
interface AIProvider {
  generateQuestions(
    prompt: { systemPrompt: string; userPrompt: string },
    options: GenerationOptions
  ): Promise<string>;
  
  // Add batch processing support
  generateQuestionsBatch(
    prompts: Array<{ systemPrompt: string; userPrompt: string }>,
    options: GenerationOptions
  ): Promise<string[]>;
  
  getDefaultModel(): string;
  getAvailableModels(): string[];
}

// Configuration options for AI generation
interface GenerationOptions {
  model: string;
  temperature?: number;
  batchSize?: number; // Maximum number of requests to process in a batch
  maxBatchWaitMs?: number; // Maximum time to wait to collect batch requests
}

// Question type definitions
type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';
type QuestionCategory = 'Objective' | 'Subjective';
type QuestionSubjectType = 'Mathematics' | 'Science' | 'SocialScience' | 'Languages' | 'ComputerScience' | 'Art' | 'PhysicalEducation' | 'Other';

type ObjectiveQuestionType = 
  'MCQ' | 
  'TrueFalse' | 
  'FillInBlanks' | 
  'MatchTheFollowing' | 
  'AssertionReasoning';

type SubjectiveQuestionType = 
  'Descriptive' |
  'Analytical' |
  'Evaluative' |
  'Comparative' |
  'ApplicationBased' |
  'CaseStudy' |
  'OpinionBased' |
  'Exploratory' |
  'CauseEffect' |
  'Hypothetical' |
  'Interpretive' |
  'Justification';

type QuestionType = ObjectiveQuestionType | SubjectiveQuestionType;

// Enhanced question generation interface
interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  marks: number;
  options?: string[]; // For MCQ type questions
  answer?: string; // Correct answer
  explanation?: string; // Explanation for the answer
  applicableSubjects?: string[]; // Subjects this question can be used for
}

// Add a server-only marker for functions that use Node.js features
// const isServer = typeof window === 'undefined'; // This is now in pdf-parser-server.ts if needed there, or can be local if other functions need it.

/**
 * Generates questions using AI based on the provided textbook content
 * 
 * @param textbookContent The extracted text from the PDF textbook
 * @param difficulty The difficulty level for the questions
 * @param category The category of questions (Objective or Subjective)
 * @param subtype The specific question type
 * @param subject The subject area
 * @param count Number of questions to generate
 * @param useBatch Whether to use batch processing (more cost-effective for large numbers)
 * @returns Array of generated questions
 */
export async function generateQuestions(
  textbookContent: string,
  difficulty: QuestionDifficulty,
  category: QuestionCategory = 'Objective',
  subtype?: string,
  subject?: string,
  count = 10,
  useBatch = false
): Promise<GeneratedQuestion[]> {
  // Get AI provider and model selection from localStorage if available
  let providerName = process.env.DEFAULT_AI_PROVIDER || "openai";
  let model = "";
  
  // Check if we're in a browser environment for model selection
  if (typeof window !== 'undefined') {
    const localProvider = localStorage.getItem('ai_provider');
    const localModel = localStorage.getItem('ai_model');
    
    if (localProvider) {
      providerName = localProvider;
    }
    
    if (localModel) {
      model = localModel;
    }
  }
  
  // Create provider instance
  const provider = AIProviderFactory.createProvider(providerName);
  if (!provider) {
    throw new Error(`Unsupported AI provider: ${providerName}`);
  }
  
  // Use default model if none specified
  if (!model) {
    model = provider.getDefaultModel();
  }
  
  console.log(`Generating ${count} ${difficulty} ${category} questions${subtype ? ` of type ${subtype}` : ''} for ${subject || 'general'} using ${providerName}/${model}`);
  
  try {
    let allQuestions: GeneratedQuestion[] = [];
    
    if (useBatch && count > 1) {
      // For batch processing, we generate questions in smaller batches
      let questionsPerBatch = 5; // Default batch size
      let concurrentBatches = 3; // Default concurrency
      
      // Get user-configured batch settings if available
      if (typeof window !== 'undefined') {
        const storedBatchSize = localStorage.getItem('batch_size');
        const storedConcurrency = localStorage.getItem('batch_concurrency');
        
        if (storedBatchSize) {
          questionsPerBatch = parseInt(storedBatchSize);
        }
        
        if (storedConcurrency) {
          concurrentBatches = parseInt(storedConcurrency);
        }
      }
      
      const numBatches = Math.ceil(count / questionsPerBatch);
      const batchPrompts = [];
      
      // Create prompts for each batch
      for (let i = 0; i < numBatches; i++) {
        const batchSize = Math.min(questionsPerBatch, count - (i * questionsPerBatch));
        const batchPrompt = createPromptForQuestionGeneration(
          textbookContent, 
          difficulty, 
          category,
          subtype,
          subject,
          batchSize
        );
        batchPrompts.push(batchPrompt);
      }
      
      // Process batches with appropriate provider
      const responses = await processBatchPrompts(provider, batchPrompts, model);
      
      // Parse responses and collect questions
      for (const response of responses) {
        if (response) {
          const parsedQuestions = parseQuestionsFromAIResponse(
            response, 
            difficulty, 
            category, 
            subject
          );
          allQuestions = [...allQuestions, ...parsedQuestions];
        }
      }
    } else {
      // Standard single request
      const prompt = createPromptForQuestionGeneration(
        textbookContent, 
        difficulty, 
        category, 
        subtype, 
        subject, 
        count
      );
      
      const response = await provider.generateQuestions(
        prompt, 
        { model, temperature: 0.7 }
      );
      
      allQuestions = parseQuestionsFromAIResponse(
        response, 
        difficulty, 
        category, 
        subject
      );
    }
    
    // Return exactly the number requested (in case we got more)
    return allQuestions.slice(0, count);
  } catch (error) {
    console.error(`${providerName} API error:`, error);
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process multiple prompts in batch for more efficient API usage
 */
async function processBatchPrompts(
  provider: AIProvider, 
  prompts: Array<{ systemPrompt: string; userPrompt: string }>,
  model: string
): Promise<string[]> {
  // Get concurrency limit from localStorage or use default
  let concurrentLimit = 3; // Default concurrency
  
  if (typeof window !== 'undefined') {
    const storedConcurrency = localStorage.getItem('batch_concurrency');
    if (storedConcurrency) {
      concurrentLimit = parseInt(storedConcurrency);
    }
  }
  
  // Process prompts in batches with limited concurrency
  if (prompts.length <= concurrentLimit) {
    // If we have fewer prompts than our concurrency limit, process all at once
    return provider.generateQuestionsBatch(prompts, { model, temperature: 0.7 });
  } else {
    // Process in batches based on concurrency limit
    const results: string[] = [];
    for (let i = 0; i < prompts.length; i += concurrentLimit) {
      const batch = prompts.slice(i, i + concurrentLimit);
      const batchResults = await provider.generateQuestionsBatch(batch, { model, temperature: 0.7 });
      results.push(...batchResults);
    }
    return results;
  }
}

// Update OpenAI provider with optimized batch processing
class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateQuestions(
    prompt: { systemPrompt: string; userPrompt: string },
    options: GenerationOptions
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options.model,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ],
      temperature: options.temperature || 0.7,
      response_format: { type: "json_object" }
    });
    
    return completion.choices[0]?.message.content || "";
  }

  async generateQuestionsBatch(
    prompts: Array<{ systemPrompt: string; userPrompt: string }>,
    options: GenerationOptions
  ): Promise<string[]> {
    if (prompts.length === 0) {
      return [];
    }
    
    // Create requests for parallel processing
    const requests = prompts.map(prompt => 
      this.client.chat.completions.create({
        model: options.model,
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: prompt.userPrompt }
        ],
        temperature: options.temperature || 0.7,
        response_format: { type: "json_object" }
      })
    );
    
    // Process all requests in parallel
    const completions = await Promise.all(requests);
    
    // Extract content from responses
    return completions.map(completion => 
      completion.choices[0]?.message.content || ""
    );
  }

  getDefaultModel(): string {
    return "gpt-4-turbo-preview";
  }

  getAvailableModels(): string[] {
    return [
      "gpt-4-turbo-preview",
      "gpt-4o",
      "gpt-4",
      "gpt-3.5-turbo"
    ];
  }
}

// Update Gemini provider with optimized batch processing
class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateQuestions(
    prompt: { systemPrompt: string; userPrompt: string },
    options: GenerationOptions
  ): Promise<string> {
    const combinedPrompt = `${prompt.systemPrompt}\n\n${prompt.userPrompt}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: combinedPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text || "";
  }

  async generateQuestionsBatch(
    prompts: Array<{ systemPrompt: string; userPrompt: string }>,
    options: GenerationOptions
  ): Promise<string[]> {
    if (prompts.length === 0) {
      return [];
    }
    
    // Create combined prompts
    const combinedPrompts = prompts.map(prompt => 
      `${prompt.systemPrompt}\n\n${prompt.userPrompt}`
    );
    
    // Prepare requests
    const requests = combinedPrompts.map(promptText => 
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText }
              ]
            }
          ],
          generationConfig: {
            temperature: options.temperature || 0.7,
          }
        })
      })
    );
    
    // Process all requests in parallel
    const responses = await Promise.all(requests);
    
    // Extract content from responses
    const results: string[] = [];
    for (const response of responses) {
      if (!response.ok) {
        console.error(`Gemini API error: ${response.status} ${response.statusText}`);
        results.push("");
        continue;
      }
      
      const data = await response.json();
      results.push(data.candidates[0]?.content?.parts[0]?.text || "");
    }
    
    return results;
  }

  getDefaultModel(): string {
    return "gemini-pro";
  }

  getAvailableModels(): string[] {
    return [
      "gemini-pro",
      "gemini-1.5-pro"
    ];
  }
}

// Update Claude provider with optimized batch processing
class ClaudeProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateQuestions(
    prompt: { systemPrompt: string; userPrompt: string },
    options: GenerationOptions
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model,
        system: prompt.systemPrompt,
        messages: [
          { role: 'user', content: prompt.userPrompt }
        ],
        temperature: options.temperature || 0.7,
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content[0].text || "";
  }

  async generateQuestionsBatch(
    prompts: Array<{ systemPrompt: string; userPrompt: string }>,
    options: GenerationOptions
  ): Promise<string[]> {
    if (prompts.length === 0) {
      return [];
    }
    
    // Prepare requests
    const requests = prompts.map(prompt => 
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model,
          system: prompt.systemPrompt,
          messages: [
            { role: 'user', content: prompt.userPrompt }
          ],
          temperature: options.temperature || 0.7,
        })
      })
    );
    
    // Process all requests in parallel
    const responses = await Promise.all(requests);
    
    // Extract content from responses
    const results: string[] = [];
    for (const response of responses) {
      if (!response.ok) {
        console.error(`Claude API error: ${response.status} ${response.statusText}`);
        results.push("");
        continue;
      }
      
      const data = await response.json();
      results.push(data.content[0]?.text || "");
    }
    
    return results;
  }

  getDefaultModel(): string {
    return "claude-3-opus-20240229";
  }

  getAvailableModels(): string[] {
    return [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307"
    ];
  }
}

// Factory to create appropriate AI provider based on configuration
class AIProviderFactory {
  static createProvider(provider: string): AIProvider | null {
    switch (provider.toLowerCase()) {
      case 'openai':
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("OpenAI API key not found in environment variables. Please add OPENAI_API_KEY to your environment.");
        }
        return new OpenAIProvider(openaiKey);
        
      case 'gemini':
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          throw new Error("Gemini API key not found in environment variables. Please add GEMINI_API_KEY to your environment.");
        }
        return new GeminiProvider(geminiKey);
        
      case 'claude':
        const claudeKey = process.env.CLAUDE_API_KEY;
        if (!claudeKey) {
          throw new Error("Claude API key not found in environment variables. Please add CLAUDE_API_KEY to your environment.");
        }
        return new ClaudeProvider(claudeKey);
        
      default:
        return null;
    }
  }
  
  static getAvailableProviders(): string[] {
    return ['openai', 'gemini', 'claude'];
  }
}

/**
 * Creates a structured prompt for AI to generate questions
 */
function createPromptForQuestionGeneration(
  textbookContent: string, 
  difficulty: QuestionDifficulty,
  category: QuestionCategory = 'Objective',
  subtype?: string,
  subject?: string,
  count = 10
) {
  let difficultyDescription = '';
  
  if (difficulty === 'Easy') {
    difficultyDescription = 'basic recall and understanding questions';
  } else if (difficulty === 'Medium') {
    difficultyDescription = 'questions requiring application and analysis';
  } else {
    difficultyDescription = 'Higher Order Thinking Skills (HOTS) questions requiring analysis, evaluation, and creative thinking';
  }
  
  // Get subject-specific guidance if both subject and subtype are provided
  const subtypeGuidance = (subject && subtype) 
    ? getSubtypeGuidance(subject, subtype) 
    : '';
  
  const systemPrompt = `You are an expert educational question generator. 
Your task is to create ${count} ${difficulty} level ${category} questions${subtype ? ` of type ${subtype}` : ''} ${subject ? `for ${subject}` : ''} based on the textbook content provided.
${difficulty === 'Hard' ? 'These should be Higher Order Thinking Skills (HOTS) questions that require students to analyze, evaluate, and think critically.' : ''}
${subtypeGuidance}
Generate a variety of questions appropriate for the ${difficulty} difficulty level.
Your response must be valid JSON.`;

  // Create user prompt based on the category and subtype
  let userPromptContent = `Generate ${count} ${difficultyDescription} based on this textbook content:
  
${textbookContent.substring(0, 8000)} // Limit content length to avoid token limits

For each question, provide:
1. The question text
2. The question type (${subtype || (category === 'Objective' ? 'MCQ, TrueFalse, FillInBlanks, MatchTheFollowing, AssertionReasoning' : 'Descriptive, Analytical, Evaluative, etc.')})
3. The question category (${category})
4. Difficulty level (${difficulty})
5. Marks (1-5 based on complexity)
6. List of subjects this question is applicable for
`;

  // Add type-specific instructions
  if (category === 'Objective') {
    userPromptContent += `
7. For MCQs, provide 4 options with the correct answer marked
8. For True/False, provide the correct answer
9. For Fill in the Blanks, provide the correct answers
10. For Match the Following, provide the correct matches
`;
  } else {
    userPromptContent += `
7. Provide a model answer or solution
8. Provide evaluation criteria for grading
`;
  }

  userPromptContent += `
Format your response as a JSON object with a "questions" property containing an array of question objects:
{
  "questions": [
    {
      "text": "Question text",
      "type": "QuestionType",
      "category": "${category}",
      "difficulty": "${difficulty}",
      "marks": 1,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct answer",
      "explanation": "Why this is the correct answer",
      "applicableSubjects": ["Subject1", "Subject2"]
    }
  ]
}`;

  return { systemPrompt, userPrompt: userPromptContent };
}

/**
 * Get subject-specific guidance for question subtypes
 */
function getSubtypeGuidance(subject: string, subtype: string): string {
  // Default guidance
  let guidance = `Create appropriate ${subtype} questions for ${subject} that test understanding at the specified difficulty level.`;
  
  // Try to match with a specific subject and question type
  if (subject.toLowerCase().includes("math")) {
    if (subtype.toLowerCase().includes("application")) {
      guidance = "Create problems that require students to apply mathematical concepts to real-world situations.";
    } else if (subtype.toLowerCase().includes("analytic")) {
      guidance = "Create problems that require students to analyze mathematical relationships and patterns.";
    } else if (subtype.toLowerCase().includes("justif")) {
      guidance = "Create problems where students must justify their mathematical reasoning and solution steps.";
    } else if (subtype.toLowerCase().includes("hypothet")) {
      guidance = "Create 'what if' scenarios that require extending mathematical concepts beyond standard applications.";
    }
  } else if (subject.toLowerCase().includes("science")) {
    if (subtype.toLowerCase().includes("descript")) {
      guidance = "Create questions requiring detailed explanations of scientific phenomena, processes, or concepts.";
    } else if (subtype.toLowerCase().includes("analytic")) {
      guidance = "Create questions requiring analysis of scientific data, experiments, or observations.";
    } else if (subtype.toLowerCase().includes("cause")) {
      guidance = "Create questions about cause-and-effect relationships in scientific processes.";
    } else if (subtype.toLowerCase().includes("application")) {
      guidance = "Create questions applying scientific principles to real-world scenarios or novel situations.";
    }
  } else if (subject.toLowerCase().includes("language") || subject.toLowerCase().includes("english")) {
    if (subtype.toLowerCase().includes("interpret")) {
      guidance = "Create questions requiring interpretation of passages, symbolism, or literary devices.";
    } else if (subtype.toLowerCase().includes("analytic")) {
      guidance = "Create questions analyzing language structure, writing style, or rhetorical techniques.";
    } else if (subtype.toLowerCase().includes("evaluat")) {
      guidance = "Create questions evaluating effectiveness of communication, arguments, or literary techniques.";
    } else if (subtype.toLowerCase().includes("compar")) {
      guidance = "Create questions comparing different texts, styles, or literary works.";
    }
  }
  
  // Common question types for all subjects
  if (subtype.toLowerCase().includes("mcq")) {
    guidance = "Create multiple-choice questions with one correct answer and three plausible distractors.";
  } else if (subtype.toLowerCase().includes("true") || subtype.toLowerCase().includes("false")) {
    guidance = "Create statements that are clearly true or false based on the textbook content.";
  } else if (subtype.toLowerCase().includes("fill") || subtype.toLowerCase().includes("blank")) {
    guidance = "Create sentences with key terms or concepts missing, which students need to complete.";
  } else if (subtype.toLowerCase().includes("match")) {
    guidance = "Create two columns of related items that students need to match correctly.";
  }
  
  return guidance;
}

/**
 * Parses the raw response from AI into structured question objects
 */
function parseQuestionsFromAIResponse(
  responseText: string, 
  difficulty: QuestionDifficulty,
  category: QuestionCategory = 'Objective',
  subject?: string
): GeneratedQuestion[] {
  try {
    // Parse the JSON response
    const jsonResponse = JSON.parse(responseText);
    
    // Access the questions array
    if (jsonResponse.questions && Array.isArray(jsonResponse.questions)) {
      // Validate and format each question
      const validatedQuestions = jsonResponse.questions.map((q: any) => {
        // Determine category if not specified
        const questionCategory = q.category || category;
        
        // Ensure each question has required properties
        const question: GeneratedQuestion = {
          text: q.text || `Untitled ${difficulty} Question`,
          type: validateQuestionType(q.type),
          category: questionCategory,
          difficulty: difficulty,
          marks: typeof q.marks === 'number' ? q.marks : getDefaultMarks(q.type, questionCategory),
          applicableSubjects: q.applicableSubjects || (subject ? [subject] : [])
        };
        
        // Add optional properties if present
        if (q.options && Array.isArray(q.options)) {
          question.options = q.options;
        }
        
        if (q.answer) {
          question.answer = q.answer;
        }
        
        if (q.explanation) {
          question.explanation = q.explanation;
        }
        
        return question;
      });
      
      return validatedQuestions;
    }
    
    throw new Error("Response did not contain a valid 'questions' array");
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates that the question type is one of the allowed types
 */
function validateQuestionType(type: string): QuestionType {
  const validObjectiveTypes: ObjectiveQuestionType[] = [
    'MCQ', 'TrueFalse', 'FillInBlanks', 'MatchTheFollowing', 'AssertionReasoning'
  ];
  
  const validSubjectiveTypes: SubjectiveQuestionType[] = [
    'Descriptive', 'Analytical', 'Evaluative', 'Comparative', 
    'ApplicationBased', 'CaseStudy', 'OpinionBased', 'Exploratory',
    'CauseEffect', 'Hypothetical', 'Interpretive', 'Justification'
  ];
  
  const validTypes = [...validObjectiveTypes, ...validSubjectiveTypes];
  
  // Normalize the type string
  const normalizedType = type.replace(/[^a-zA-Z]/g, '').trim();
  
  // Try to match to a valid type
  const matchedType = validTypes.find(
    validType => validType.toLowerCase() === normalizedType.toLowerCase()
  );
  
  if (matchedType) {
    return matchedType as QuestionType;
  }
  
  // Handle common aliases
  if (/^multiple\s*choice/i.test(type)) return 'MCQ';
  if (/^true\s*false/i.test(type) || /^t\s*f/i.test(type)) return 'TrueFalse';
  if (/^fill/i.test(type)) return 'FillInBlanks';
  if (/^match/i.test(type)) return 'MatchTheFollowing';
  if (/^assert/i.test(type)) return 'AssertionReasoning';
  
  if (/^descript/i.test(type)) return 'Descriptive';
  if (/^analy/i.test(type)) return 'Analytical';
  if (/^eval/i.test(type)) return 'Evaluative';
  if (/^compar/i.test(type)) return 'Comparative';
  if (/^appl/i.test(type)) return 'ApplicationBased';
  if (/^case/i.test(type)) return 'CaseStudy';
  if (/^opinion/i.test(type)) return 'OpinionBased';
  if (/^explor/i.test(type)) return 'Exploratory';
  if (/^cause/i.test(type)) return 'CauseEffect';
  if (/^hypo/i.test(type)) return 'Hypothetical';
  if (/^interp/i.test(type)) return 'Interpretive';
  if (/^just/i.test(type)) return 'Justification';
  
  // Default based on length of expected answer
  if (type.toLowerCase().includes('short')) return 'Descriptive';
  if (type.toLowerCase().includes('long')) return 'Analytical';
  
  // If no match, default to MCQ
  return 'MCQ';
}

/**
 * Returns default marks based on question type and category
 */
function getDefaultMarks(type: string, category: QuestionCategory): number {
  // Objective questions typically have lower marks
  if (category === 'Objective') {
    return 1;  // Most objective questions are worth 1 mark
  }
  
  // For subjective questions, assign marks based on complexity
  const normalizedType = validateQuestionType(type);
  
  switch(normalizedType) {
    case 'Analytical':
    case 'Evaluative':
    case 'CaseStudy':
    case 'Exploratory':
      return 5;  // Complex analysis questions
      
    case 'Comparative':
    case 'ApplicationBased':
    case 'Justification':
    case 'CauseEffect':
    case 'Hypothetical':
      return 3;  // Medium complexity questions
      
    case 'Descriptive':
    case 'OpinionBased':
    case 'Interpretive':
      return 2;  // Simpler subjective questions
      
    default:
      return 1;  // Default for any unrecognized type
  }
}

// extractTextFromPdf and downloadFile have been moved to src/utils/pdf-parser-server.ts
// If these functionalities are needed by ai-service.ts, they should be imported
// from './pdf-parser-server' and called in a server-only context.

/**
 * Splits extracted text into manageable sections for AI processing
 */
export function splitTextIntoSections(text: string, maxLength = 8000): string[] {
  // Split text into chunks that won't exceed token limits
  const sections = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    // Try to find a natural break point
    let breakPoint = maxLength;
    if (remaining.length > maxLength) {
      // Look for a paragraph or sentence break
      const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength);
      const sentenceBreak = remaining.lastIndexOf('. ', maxLength);
      
      if (paragraphBreak > maxLength * 0.75) {
        breakPoint = paragraphBreak + 2; // Include the newlines
      } else if (sentenceBreak > maxLength * 0.75) {
        breakPoint = sentenceBreak + 2; // Include the period and space
      }
    } else {
      breakPoint = remaining.length;
    }
    
    sections.push(remaining.substring(0, breakPoint));
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return sections;
}

/**
 * Returns information about available AI providers and models
 */
export function getAIProviderInfo() {
  const providers = AIProviderFactory.getAvailableProviders();
  
  const modelsByProvider: Record<string, string[]> = {};
  
  providers.forEach(providerName => {
    try {
      const provider = AIProviderFactory.createProvider(providerName);
      if (provider) {
        modelsByProvider[providerName] = provider.getAvailableModels();
      }
    } catch (error) {
      // Skip providers with missing API keys
      modelsByProvider[providerName] = [];
    }
  });
  
  return {
    providers,
    modelsByProvider,
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || "openai"
  };
} 