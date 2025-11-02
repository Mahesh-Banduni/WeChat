import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NotFoundError, BadRequestError } from "../../errors/errors.js";
import { PrismaClient } from "@prisma/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const prisma = new PrismaClient();

// ----------------- Initialize Pinecone -----------------
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index("wechat");

// ----------------- Initialize Gemini LLM -----------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ----------------- Connect MCP Server -----------------
export async function connectMcpServer(serverScriptPath) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverScriptPath],
  });

  const mcpClient = new Client({ name: "backend-client", version: "1.0.0" });
  await mcpClient.connect(transport);

  // Fetch raw tools
  const toolsResponse = await mcpClient.listTools();

  // Normalize into clean objects
  const tools = toolsResponse.tools.map(t => ({
    name: t.name,
    description: t.description || "",
    inputSchema: t.inputSchema || {},
  }));

  // Log them
  // console.log("✅ Connected to MCP server with tools:");
  // tools.forEach(t => {
  //   console.log(`- ${t.name}: ${t.description}`);
  //   console.log(`  Schema: ${JSON.stringify(t.inputSchema, null, 2)}`);
  // });

  return { mcpClient, tools };
}

const { mcpClient, tools } = await connectMcpServer("src/mcp-server/server.js");

// ----------------- Dynamic MCP Tool Chatbot -----------------
export async function queryChatbot(query, context, userId) {
  let toolsList;
  try {
    toolsList = tools.map(t => ({ name: t.name, description: t.description || "No description" }));
  } catch (err) {
    console.error("❌ Failed to fetch tools:", err);
    return { response: "⚠️ Could not fetch tools.", confidence: 0 };
  }

  // Build prompt dynamically
  const prompt = `
  You are a customer support assistant.

  Available tools:
  ${JSON.stringify(toolsList, null, 2)}

  Instructions:
  - Analyze the user query carefully. 
  - If a tool can assist in responding, output **only** the following JSON:
    { "tool": "<tool_name>", "description": "<tool_description>" }
  - If no tool is required, output:
    { "tool": null }
  - Do not include any extra text or commentary outside the specified JSON format.
  - Ensure the output is accurate, concise, and based solely on the available tools.

  User Query: ${query}
  `;

  // Call Gemini LLM directly
  let rawResponse;
  try {
    rawResponse = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent({
      contents: [ ...context.slice(-30).map(msg => ({ role: msg.sender, parts: [{ text: msg.text }] })),
      { role: "user", parts: [{ text: prompt }] }],
    });
  } catch (err) {
    console.error("❌ LLM call failed:", err);
    return { response: "⚠️ LLM call failed.", confidence: 0 };
  }

  let text = rawResponse.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse LLM output to JSON
  let toolDecision;
  try {
    text = text.trim();
    if (text.startsWith("```")) text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) text = text.slice(firstBrace, lastBrace + 1);
    toolDecision = JSON.parse(text);
  } catch (err) {
    console.error("❌ Failed to parse LLM tool decision:", text, err);
    return { response: "⚠️ Could not understand tool decision.", confidence: 0 };
  }

  // Execute tool if selected
  if (toolDecision.tool && toolDecision.tool !== "null") {
    try {
      const execResult = await mcpClient.callTool({
        name: toolDecision.tool,
        arguments: toolDecision.tool==='listTools' ? {} : {userId: userId}
      });
      const toolOutput = execResult.content?.[0]?.text || "No output";
      const prompt = `
      You are a customer support assistant responding to a user query based on the tool you just executed.

      Tool executed:
      ${JSON.stringify(toolDecision)}

      Instructions:
      - Refer to tools as Tool 1, Tool 2, etc., describing their function rather than using the actual names.
      - Do not mention or reveal any user IDs.
      - Analyze the tool output and provide a concise, professional, and human-readable response.
      - If the response involves multiple points, list them in order, without bolding or special formatting.
      - Only provide information that can be confidently inferred from the tool output; do not make assumptions or add unrelated information.

      Tool output: ${toolOutput}
      `;
      // Call Gemini LLM directly
      let rawResponse;

        try {
            rawResponse = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent({
              contents: [...context.slice(-30).map(msg => ({ role: msg.sender, parts: [{ text: msg.text }] }))
              ,{ role: "user", parts: [{ text: prompt }] }],
            });
          } catch (err) {
            console.error("❌ LLM call failed:", err);
            return { response: "⚠️ LLM call failed.", confidence: 0 };
          }
          let finalResponse = rawResponse.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return { response: finalResponse, tool: toolDecision.tool, confidence: 1 };
        } catch (err) {
          console.error("❌ Tool execution failed:", err);
          return { response: `⚠️ Failed to execute tool: ${toolDecision.tool}`, confidence: 0.5 };
        }
      }

  if (toolDecision.tool === null||undefined) {
    let content = context
    .slice(-30) // Take only the last 30 messages
    .map(msg => ({
      role: msg.sender,
      parts: [{ text: msg.text }],
    }));

    const prompt = `
    You are a customer support assistant tasked with responding to a user query using context from previous messages.

    Instructions:
    - Refer to tools as Tool 1, Tool 2, etc., describing their function instead of using their actual names.
    - Do not mention or reveal any user IDs.
    - Do not explicitly reference or mention the knowledge base.
    - Analyze the user query and relevant context, then provide a concise, professional response in a helpful and polite tone.
    - If the answer involves multiple points, list them in order, without bolding or special formatting.
    - Do not make up information or assume details that are not provided. Only provide information that can be confidently inferred from the context.
    - If there is no suitable or confident answer or the asked question is inappropriate, respond - I'm WeChat Assistant. How can I help you with WeChat today? 

    Knowledge base: ${JSON.stringify(content)}
    `;
      // Call Gemini LLM directly
      let rawResponse;

        try {
            rawResponse = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
            });
          } catch (err) {
            console.error("❌ LLM call failed:", err);
            return { response: "⚠️ LLM call failed.", confidence: 0 };
          }
          let finalResponse = rawResponse.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return { response: finalResponse, confidence: 1 };
  }

  return { response: "Sorry i am facing technical difficulties right now. Please try after sometime.", confidence: 0.8 };
}

// const queryChatbot = async (query) => {
//   try {
//     console.info(`🙋 User: "${query}"`);

//     const normalizedQuery = query.trim().toLowerCase();
//     const enhancedQuery = `${normalizedQuery} WeChat`;

//     // ----------------- Step 1: Generate embeddings with Gemini -----------------
//     console.info("🤖 Assistant: Searching WeChat knowledge base...");

//     const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
//     const embeddingResponse = await embeddingModel.embedContent({
//       content: { parts: [{ text: query }] },
//       outputDimensionality: 768,
//     });
//     const vector = embeddingResponse.embedding.values;

//     const searchResponse = await index.query({
//       vector,
//       topK: 8,
//       includeMetadata: true,
//       filter: { source: "wechat_faq", contentType: "faq" },
//     });

//     const relevantMatches = searchResponse.matches || [];

//     if (relevantMatches.length === 0) {
//       console.info("🤖 Assistant: No relevant FAQ found for this query.");
//       return {
//         response: "I'm sorry, I couldn't find relevant information in WeChat's FAQ for your question. Please contact support for personalized assistance.",
//         sources: [],
//         confidence: 0,
//       };
//     }

//     // ----------------- Step 3: Create structured context -----------------
//     const contextSections = relevantMatches.map((match, index) => {
//       const metadata = match.metadata;
//       return `[FAQ ${index + 1}] Category: ${metadata.category}
// Q: ${metadata.question}
// A: ${metadata.answer}
// Relevance Score: ${(match.score * 100).toFixed(1)}%`;
//     });
//     const structuredContext = contextSections.join("\n\n---\n\n");

//     // ----------------- Step 4: Generate response with Gemini Chat -----------------
//     const chatModel = genAI.getGenerativeModel({ 
//       model: "gemini-1.5-flash", // Use correct model name
//       generationConfig: {
//         temperature: 0.2,
//         maxOutputTokens: 800,
//       },
//     });

//     const prompt = `You are WeChat's helpful customer support assistant. You can ONLY answer questions based on the provided FAQ content below.

// Company context:
// - WeChat is a multi-purpose messaging and social media platform.
// - Public contact: support@wechat.com.
// - Primary audiences: End-users, Businesses, Developers.

// Guidelines:
// - Help with any WeChat-related query (messaging, business accounts, developer tools).
// - Prefer the FAQ content below when relevant. If it does not fully answer the question, continue assisting with general guidance and ask up to two clarifying questions if needed.
// - Do NOT invent WeChat-specific facts. If unsure, say so and recommend contacting WeChat support.
// - Security & privacy: never request sensitive data (passwords); direct users to secure channels.
// - Unrelated topics: politely redirect to WeChat-related questions only.

// AVAILABLE FAQ CONTENT:
// ${structuredContext}

// User Question: ${query}

// Please provide a helpful response based on the above information:`;

//     const chatResult = await chatModel.generateContent(prompt);
//     const botResponse = await chatResult.response.text();

//     // ----------------- Step 5: Prepare sources and confidence -----------------
//     const sources = relevantMatches.map((match) => ({
//       id: match.id,
//       score: parseFloat((match.score * 100).toFixed(1)),
//       question: match.metadata?.question || "FAQ Item",
//       category: match.metadata?.category || "General",
//       sourceId: match.metadata?.sourceId,
//     }));

//     const maxConfidence = relevantMatches.length > 0
//       ? Math.max(...relevantMatches.map((m) => m.score))
//       : 0;

//     console.info(
//       `✅ Assistant: Response generated with ${sources.length} sources, confidence: ${(maxConfidence * 100).toFixed(1)}%`
//     );

//     return {
//       response: botResponse,
//       sources,
//       confidence: parseFloat((maxConfidence * 100).toFixed(1)),
//       metadata: {
//         totalMatches: searchResponse.matches.length,
//         relevantMatches: relevantMatches.length,
//         processedAt: new Date().toISOString(),
//         queryEnhanced: enhancedQuery !== normalizedQuery,
//       },
//     };
//   } catch (error) {
//     console.error("❌ Assistant: Error processing chatbot query.", error);
//     throw new BadRequestError(500, {
//       error: "Chatbot query failed.",
//       details: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

const syncCompanyData = async () =>{
  const allfaqData = await prisma.faqCategory.findMany({
    select:{
      faqCategoryId: true,
      title: true,
      faqs: {
        select: {
          faqId: true,
          question: true,
          answer: true
        }
      }
    }
  });

    // Helper function to clean and normalize text for better embedding
    function normalizeText(text) {
      return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
        .trim();
    }

    // Helper function to create search-optimized text chunks
    function createSearchableContent(faq) {
      const question = normalizeText(faq.question);
      const answer = normalizeText(faq.answer);
      const category = normalizeText(faq.categoryTitle);

      // Create multiple searchable variations for better retrieval
      return {
        primary: `${question} ${answer}`,
        questionFocused: `Question: ${question}\nAnswer: ${answer}`,
        categoryContext: `${category}: ${question} - ${answer}`,
        keywordRich: `${question} ${answer} ${category} WeChat` // Changed from NuBNB to WeChat
      };
    }

    try {
    const faqData = allfaqData;

    // Step 3: Enhanced FAQ flattening with better metadata
   const allFaqs = faqData?.flatMap(category =>
     category.faqs.map(faq => ({
       ...faq,
       categoryTitle: category.title,
       categoryId: category.faqCategoryId, // fixed key
       // Add search keywords for better retrieval
       keywords: [
         ...faq.question.toLowerCase().split(' '),
         ...faq.answer.toLowerCase().split(' '),
         category.title.toLowerCase(),
         'wechat',     // domain keyword
         'messaging',
         'payment',
         'social media'
       ].filter(word => word.length > 2) // Remove short/common words
     }))
   ) || [];


    if (allFaqs.length === 0) {
      return {
        success: true,
        message: 'No FAQs found to sync.',
        vectorsStored: 0,
      };
    }

    console.log(`📊 Found ${allFaqs.length} FAQs across ${faqData?.data?.categories?.length || 0} categories`);

    // Step 4: Get Pinecone index
    const index = pinecone.index("wechat");

    // Step 5: Get existing vectors to avoid unnecessary updates
    console.log('🔍 Checking existing vectors...');
    let existingIds = new Set();
    try {
      const stats = await index.describeIndexStats();
      console.log('📈 Current index stats:', stats);
    } catch (error) {
      console.log('⚠️  Could not fetch index stats:', error.message);
    }

    // Step 6: Initialize the Gemini embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

    // Step 7: Process FAQs with optimized batching
    const batchSize = 50; // Reduced batch size for more stable processing
    let totalVectorsUpserted = 0;
    let skippedCount = 0;

    console.log('⚡ Starting vector processing with Gemini...');
    
    for (let i = 0; i < allFaqs.length; i += batchSize) {
      const batch = allFaqs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allFaqs.length / batchSize);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

      try {
        const vectorsToUpsert = await Promise.all(
          batch.map(async (faq, index) => {
            try {
              // Create optimized content for embedding
              const searchableContent = createSearchableContent(faq);
              
              // Use primary content for embedding (best balance of context and retrieval)
              // GEMINI EMBEDDING CALL (REPLACES OPENAI)
              const embeddingResponse = await embeddingModel.embedContent(searchableContent.primary);
              const embeddingValues = embeddingResponse.embedding.values;

              return {
                id: `wechat-faq-${faq.faqId}`, // Prefixed for better organization
                values: embeddingValues,
                metadata: {
                  // Core content
                  question: faq.question,
                  answer: faq.answer,
                  text: searchableContent.primary, // Store the embedded text for reference
                  
                  // Category information
                  category: faq.categoryTitle,
                  categoryId: faq.categoryId,
                  
                  // Search optimization
                  keywords: faq.keywords.slice(0, 20).join(','), // Limit keywords for metadata size
                  searchableText: searchableContent.keywordRich,
                  
                  // Source tracking
                  sourceId: faq.faqId,
                  source: 'wechat_faq', // Changed from nubnb_faq
                  
                  // Sync metadata
                  syncTimestamp: new Date().toISOString(),
                  version: '2.0', // Track sync version for future migrations
                  
                  // Retrieval optimization
                  contentType: 'faq',
                  contentLength: (faq.question + faq.answer).length,
                  priority: faq.priority || 'normal', // If you have priority in your data
                },
              };
            } catch (error) {
              console.error(`❌ Error processing FAQ ${faq.faqId}:`, error.message);
              throw error;
            }
          })
        );

        // Filter out any failed vectors
        const validVectors = vectorsToUpsert.filter(v => v && v.values);
        
        if (validVectors.length > 0) {
          // Upsert with retry logic
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              await index.upsert(validVectors);
              totalVectorsUpserted += validVectors.length;
              console.log(`✅ Stored batch ${batchNumber}: ${validVectors.length} vectors`);
              break;
            } catch (upsertError) {
              retryCount++;
              console.error(`⚠️  Batch ${batchNumber} attempt ${retryCount} failed:`, upsertError.message);
              
              if (retryCount === maxRetries) {
                throw new Error(`Failed to upsert batch ${batchNumber} after ${maxRetries} attempts`);
              }
              
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
          }
        } else {
          skippedCount += batch.length;
          console.log(`⚠️  Skipped batch ${batchNumber}: no valid vectors`);
        }

        // Add delay between batches to avoid rate limits
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError) {
        console.error(`❌ Failed to process batch ${batchNumber}:`, batchError.message);
        // Continue with next batch instead of failing completely
        skippedCount += batch.length;
      }
    }

    // Step 8: Final verification
    console.log('🔍 Verifying sync results...');
    let finalStats = null;
    try {
      finalStats = await index.describeIndexStats();
      console.log('📊 Final index stats:', finalStats);
    } catch (error) {
      console.log('⚠️  Could not fetch final stats:', error.message);
    }

    // Step 9: Return comprehensive results
    const result = {
      success: true,
      message: `Successfully synced WeChat FAQ data`,
      details: {
        totalFaqsProcessed: allFaqs.length,
        vectorsStored: totalVectorsUpserted,
        vectorsSkipped: skippedCount,
        categoriesProcessed: faqData?.data?.categories?.length || 0,
        syncTimestamp: new Date().toISOString(),
        version: '2.0',
        embeddingModel: 'gemini-embedding-001' // Added to show which model was used
      },
      indexStats: finalStats,
      optimizations: {
        textNormalization: true,
        keywordExtraction: true,
        searchableContent: true,
        retryLogic: true,
        batchProcessing: true
      }
    };

    console.log('🎉 WeChat FAQ sync completed successfully!', result.details);
    return result;

  } catch (error) {
    console.error('💥 Sync process failed:', error);
    return {
      success: false,
      error: error.message,
      details: {
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
}

export default {
  queryChatbot,
  syncCompanyData
};