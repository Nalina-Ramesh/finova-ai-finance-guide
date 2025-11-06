// AI Service using IBM Granite models from Hugging Face
// Uses Hugging Face Inference API (no API key required for public models)

import { storageService, User, FinancialData, ChatMessage } from './storage';

interface AIResponse {
  content: string;
  suggestions?: string[];
  budgetSummary?: any;
  insights?: any;
}

class AIServiceHuggingFace {
  // Use IBM Granite model from Hugging Face
  // Options: 
  // - "ibm-granite/granite-3.3-8b-instruct" (latest)
  // - "ibm-granite/granite-3.2-8b-instruct" (fallback)
  // - "microsoft/Phi-3-mini-4k-instruct" (alternative if Granite unavailable)
  private readonly MODEL_NAME = "ibm-granite/granite-3.3-8b-instruct";
  private readonly FALLBACK_MODEL = "microsoft/Phi-3-mini-4k-instruct"; // Smaller, faster alternative
  private readonly HF_API_URL = `https://api-inference.huggingface.co/models/${this.MODEL_NAME}`;
  private readonly HF_FALLBACK_URL = `https://api-inference.huggingface.co/models/${this.FALLBACK_MODEL}`;
  
  // Optional: Add Hugging Face token for better rate limits (not required)
  // Get it from https://huggingface.co/settings/tokens
  private readonly HF_TOKEN = import.meta.env.VITE_HF_TOKEN || null;

  private getUserContext(): { user: User | null; financialData: FinancialData } {
    const user = storageService.getCurrentUser();
    const financialData = storageService.getFinancialData();
    return { user, financialData };
  }

  private getDemographicTone(user: User | null): {
    tone: 'casual' | 'professional' | 'formal' | 'friendly';
    complexity: 'simple' | 'moderate' | 'detailed';
  } {
    if (!user?.demographic) {
      return { tone: 'friendly', complexity: 'moderate' };
    }

    const demographic = user.demographic.type;
    switch (demographic) {
      case 'student':
        return { tone: 'casual', complexity: 'simple' };
      case 'professional':
        return { tone: 'professional', complexity: 'detailed' };
      case 'retiree':
        return { tone: 'formal', complexity: 'simple' };
      case 'entrepreneur':
        return { tone: 'professional', complexity: 'detailed' };
      default:
        return { tone: 'friendly', complexity: 'moderate' };
    }
  }

  private buildPrompt(
    userMessage: string,
    conversationHistory: ChatMessage[],
    user: User | null,
    financialData: FinancialData,
    tone: string,
    complexity: string
  ): string {
    // Build context-aware prompt in instruction format for IBM Granite
    let prompt = `<|system|>\n`;
    prompt += `You are FINOVA, an expert personal finance assistant. Provide personalized, accurate financial advice.\n\n`;

    // Add user context
    if (user) {
      prompt += `User Profile:\n`;
      prompt += `- Name: ${user.fullName}\n`;
      if (user.demographic) {
        prompt += `- Demographic: ${user.demographic.type}`;
        if (user.demographic.age) prompt += `, Age ${user.demographic.age}`;
        if (user.demographic.occupation) prompt += `, ${user.demographic.occupation}`;
        prompt += `\n`;
      }
      if (user.financialGoals && user.financialGoals.length > 0) {
        prompt += `- Goals: ${user.financialGoals.join(', ')}\n`;
      }
    }

    // Add financial data context
    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome * 100);
    prompt += `\nFinancial Situation:\n`;
    prompt += `- Monthly Income: $${financialData.monthlyIncome.toLocaleString()}\n`;
    prompt += `- Monthly Expenses: $${financialData.monthlyExpenses.toLocaleString()}\n`;
    prompt += `- Total Balance: $${financialData.totalBalance.toLocaleString()}\n`;
    prompt += `- Savings Rate: ${savingsRate.toFixed(1)}%\n`;

    // Add conversation history
    if (conversationHistory.length > 0) {
      prompt += `\nRecent Conversation:\n`;
      conversationHistory.slice(-5).forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'FINOVA'}: ${msg.content}\n`;
      });
    }

    prompt += `\nCommunication Style: ${tone}, ${complexity} level\n`;
    prompt += `<|user|>\n${userMessage}\n<|assistant|>\n`;

    return prompt;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<AIResponse> {
    const { user, financialData } = this.getUserContext();
    const { tone, complexity } = this.getDemographicTone(user);

    // Build the prompt
    const prompt = this.buildPrompt(userMessage, conversationHistory, user, financialData, tone, complexity);

    try {
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add token if available (optional, improves rate limits)
      if (this.HF_TOKEN) {
        headers['Authorization'] = `Bearer ${this.HF_TOKEN}`;
      }

      // Try IBM Granite model first
      let response = await fetch(this.HF_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        }),
      });

      // If model is loading or rate limited, try fallback model
      if (!response.ok && response.status === 503) {
        console.log('Primary model loading, trying fallback model...');
        response = await fetch(this.HF_FALLBACK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 400,
              temperature: 0.7,
              top_p: 0.9,
              do_sample: true,
              return_full_text: false,
            },
          }),
        });
      }

      if (!response.ok) {
        // If API fails (rate limit, model loading, etc.), fall back to rule-based system
        console.warn('Hugging Face API not available, falling back to rule-based system');
        return this.fallbackResponse(userMessage, conversationHistory, user, financialData, tone, complexity);
      }

      const data = await response.json();
      
      // Handle rate limit or error responses
      if (data.error) {
        console.warn('Hugging Face API error:', data.error);
        return this.fallbackResponse(userMessage, conversationHistory, user, financialData, tone, complexity);
      }

      // Parse the response - handle different response formats
      let aiResponse = '';
      
      if (Array.isArray(data)) {
        // Handle array response format
        if (data[0]?.generated_text) {
          aiResponse = data[0].generated_text.trim();
        } else if (data[0]?.summary_text) {
          aiResponse = data[0].summary_text.trim();
        } else if (typeof data[0] === 'string') {
          aiResponse = data[0].trim();
        }
      } else if (typeof data === 'object') {
        // Handle object response format
        if (data.generated_text) {
          aiResponse = data.generated_text.trim();
        } else if (data.summary_text) {
          aiResponse = data.summary_text.trim();
        } else if (data.text) {
          aiResponse = data.text.trim();
        } else if (data[0]?.generated_text) {
          aiResponse = data[0].generated_text.trim();
        }
      } else if (typeof data === 'string') {
        aiResponse = data.trim();
      }

      // Clean up the response (remove prompt artifacts and special tokens)
      if (aiResponse) {
        // Remove special tokens that might appear
        aiResponse = aiResponse
          .replace(/<\|system\|>/g, '')
          .replace(/<\|user\|>/g, '')
          .replace(/<\|assistant\|>/g, '')
          .replace(/<\|end\|>/g, '')
          .trim();
        
        // Remove any remaining prompt context
        if (aiResponse.includes('Assistant Response:')) {
          aiResponse = aiResponse.split('Assistant Response:')[1]?.trim() || aiResponse;
        }
        if (aiResponse.includes('FINOVA:')) {
          aiResponse = aiResponse.split('FINOVA:')[1]?.trim() || aiResponse;
        }
        
        // Take first meaningful response (before next user message if any)
        if (aiResponse.includes('User:')) {
          aiResponse = aiResponse.split('User:')[0].trim();
        }
      }

      if (!aiResponse || aiResponse.length < 10) {
        return this.fallbackResponse(userMessage, conversationHistory, user, financialData, tone, complexity);
      }

      // Check if response includes budget summary or insights keywords
      const budgetSummary = this.shouldGenerateBudgetSummary(userMessage, aiResponse);
      const insights = this.shouldGenerateInsights(userMessage, aiResponse);

      return {
        content: aiResponse,
        budgetSummary: budgetSummary ? this.generateBudgetSummary(financialData) : null,
        insights: insights ? this.generateSpendingInsights(financialData) : null,
      };
    } catch (error: any) {
      console.error('Error calling Hugging Face API:', error);
      // Fallback to rule-based system
      return this.fallbackResponse(userMessage, conversationHistory, user, financialData, tone, complexity);
    }
  }

  private async fallbackResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    user: User | null,
    financialData: FinancialData,
    tone: string,
    complexity: string
  ): Promise<AIResponse> {
    // Use the original rule-based AI service as fallback
    // Import dynamically to avoid circular dependencies
    const { aiService } = await import('./aiService');
    return await aiService.generateResponse(userMessage, conversationHistory);
  }

  private shouldGenerateBudgetSummary(userMessage: string, aiResponse: string): boolean {
    const keywords = ['budget', 'summary', 'income', 'expense', 'spending', 'balance'];
    return keywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes(keyword)
    );
  }

  private shouldGenerateInsights(userMessage: string, aiResponse: string): boolean {
    const keywords = ['insight', 'spending', 'expense', 'analysis', 'recommendation'];
    return keywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes(keyword)
    );
  }

  private generateBudgetSummary(financialData: FinancialData): any {
    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
    const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;
    
    const categoryBreakdown = financialData.expenseBreakdown.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyIncome: financialData.monthlyIncome,
      monthlyExpenses: financialData.monthlyExpenses,
      monthlySavings,
      savingsRate: savingsRate.toFixed(1),
      categoryBreakdown,
      totalBalance: financialData.totalBalance,
    };
  }

  private generateSpendingInsights(financialData: FinancialData): any {
    const insights = {
      trends: [] as string[],
      anomalies: [] as string[],
      recommendations: [] as string[],
    };

    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;

    if (financialData.expenseHistory.length > 1) {
      const recentExpenses = financialData.expenseHistory.slice(-3).reduce((sum, e) => sum + e.amount, 0) / 3;
      const olderExpenses = financialData.expenseHistory.slice(-6, -3).reduce((sum, e) => sum + e.amount, 0) / 3;
      
      if (recentExpenses > olderExpenses * 1.1) {
        insights.trends.push('Your spending has increased by over 10% in recent months.');
        insights.recommendations.push('Review your recent expenses to identify areas where you can cut back.');
      } else if (recentExpenses < olderExpenses * 0.9) {
        insights.trends.push('Great job! Your spending has decreased recently.');
      }
    }

    if (savingsRate < 10) {
      insights.recommendations.push('Consider increasing your savings rate to at least 10% of your income.');
    } else if (savingsRate >= 20) {
      insights.trends.push('Excellent savings rate! You are saving 20% or more of your income.');
    }

    if (financialData.totalBalance < financialData.monthlyExpenses * 3) {
      insights.anomalies.push('Your emergency fund is below 3 months of expenses. Consider building it up.');
      insights.recommendations.push('Aim to have 3-6 months of expenses saved as an emergency fund.');
    }

    return insights;
  }
}

export const aiServiceHuggingFace = new AIServiceHuggingFace();

