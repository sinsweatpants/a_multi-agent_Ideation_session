const { GoogleGenerativeAI } = require("@google/generative-ai");

class LanguageModel {
  constructor(apiKey, modelProvider) {
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateContent(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }
}

module.exports = LanguageModel;