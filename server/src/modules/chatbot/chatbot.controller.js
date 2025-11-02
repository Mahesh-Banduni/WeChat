import chatbotService from "./chatbot.service.js";

const queryChatbot = async(req, res, next) => {
  try {
    const { query, context } = req.body;
    const userId = req.user.id;
    // Call your chatbot service or API here
    const response = await chatbotService.queryChatbot(query,context, userId);
    res.json({ response });
  } catch (error) {
    next(error);
  }
}

const syncCompanyData = async (req, res, next) => {
  try {
    const faqData = await chatbotService.syncCompanyData();
    res.json({ faqData });
  } catch (error) {
    next(error);
  }
};

export default {
    queryChatbot,
    syncCompanyData
}