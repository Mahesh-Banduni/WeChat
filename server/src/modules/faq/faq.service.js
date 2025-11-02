// services/faqSyncService.js
import fetch from "node-fetch";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index("wechat");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function syncFaqs() {
  try {
    logger.info("🤖 Assistant: Starting FAQ sync into WeChat knowledge base...");

    const res = await fetch(process.env.FAQ_API_URL);
    const data = await res.json();

    if (!data.success) {
      throw new ApiError(500, { error: "Could not fetch FAQ data from API." });
    }

    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

    for (const category of data.data.categories) {
      logger.info(`📂 Assistant: Processing category "${category.title}"...`);

      for (const faq of category.faqs) {
        const text = `${faq.question}\n${faq.answer}`;

        // Generate embeddings with Gemini
        const embeddingResponse = await embeddingModel.embedContent(text);
        const vector = embeddingResponse.embedding.values;

        // Store in Pinecone
        await index.upsert([
          {
            id: `faq-${faq.faqId}`,
            values: vector,
            metadata: {
              category: category.title,
              question: faq.question,
              answer: faq.answer,
              faqId: faq.faqId,
              source: "wechat_faq",
              contentType: "faq",
            },
          },
        ]);

        logger.info(`✅ Assistant: FAQ "${faq.faqId}" stored successfully.`);
      }
    }

    logger.info("🎉 Assistant: All WeChat FAQs have been synced successfully!");
    return { message: "FAQs synced successfully" };
  } catch (error) {
    logger.error("❌ Assistant: Error syncing FAQs.", error);
    throw new ApiError(500, {
      error: "FAQ sync process failed.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}