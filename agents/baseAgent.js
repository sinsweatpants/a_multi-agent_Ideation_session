const LanguageModel = require('../languageModel');

class BaseAgent {
  constructor(config, apiKey) {
    this.name = config.name;
    this.description = config.description;
    this.systemMessage = config.systemMessage;
    this.languageModel = new LanguageModel(apiKey, 'gemini');
  }

  async generate(prompt) {
    try {
      const response = await this.languageModel.generateContent(prompt);
      return response;
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw error;
    }
  }
}

module.exports = BaseAgent;