// AI Service for generating financial advice and responses
// Simulates IBM Watson-like capabilities for natural language processing

import { storageService, User, FinancialData, ChatMessage } from './storage';

interface AIResponse {
  content: string;
  suggestions?: string[];
  budgetSummary?: any;
  insights?: any;
}

class AIService {
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

  private generateBudgetSummary(financialData: FinancialData): any {
    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
    const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;
    
    // Calculate category breakdown
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

  private generateSpendingInsights(financialData: FinancialData): {
    trends: string[];
    anomalies: string[];
    recommendations: string[];
  } {
    const insights = {
      trends: [] as string[],
      anomalies: [] as string[],
      recommendations: [] as string[],
    };

    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;

    // Analyze expense trends
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

    // Savings rate analysis
    if (savingsRate < 10) {
      insights.recommendations.push('Consider increasing your savings rate to at least 10% of your income.');
    } else if (savingsRate >= 20) {
      insights.trends.push('Excellent savings rate! You\'re saving 20% or more of your income.');
    }

    // Category analysis
    const categoryBreakdown = financialData.expenseBreakdown.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const maxCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
    if (maxCategory && maxCategory[1] > financialData.monthlyExpenses * 0.4) {
      insights.recommendations.push(`${maxCategory[0]} is your largest expense category. Consider reviewing it for optimization opportunities.`);
    }

    // Balance check
    if (financialData.totalBalance < financialData.monthlyExpenses * 3) {
      insights.anomalies.push('Your emergency fund is below 3 months of expenses. Consider building it up.');
      insights.recommendations.push('Aim to have 3-6 months of expenses saved as an emergency fund.');
    }

    return insights;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<AIResponse> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const { user, financialData } = this.getUserContext();
    const { tone, complexity } = this.getDemographicTone(user);
    const message = userMessage.toLowerCase().trim();

    // Extract context from conversation history
    const recentContext = conversationHistory.slice(-5).map(m => m.content).join(' ').toLowerCase();
    const fullContext = recentContext + ' ' + message;

    let response = '';
    let suggestions: string[] = [];
    let budgetSummary: any = null;
    let insights: any = null;

    // Check for question words to understand intent better
    const isQuestion = message.includes('?') || 
      message.includes('how') || 
      message.includes('what') || 
      message.includes('why') || 
      message.includes('when') || 
      message.includes('where') || 
      message.includes('which') ||
      message.includes('can i') ||
      message.includes('should i') ||
      message.includes('do i') ||
      message.includes('explain') ||
      message.includes('tell me about');

    // First, try to answer specific questions about user's data
    if (isQuestion && (message.includes('how much') || message.includes('what is my') || message.includes('my'))) {
      const dataAnswer = this.answerSpecificQuestion(userMessage, user, financialData, tone, complexity);
      if (dataAnswer && !dataAnswer.includes('Could you be more specific')) {
        return {
          content: dataAnswer,
          suggestions,
          budgetSummary,
          insights,
        };
      }
    }

    // Comprehensive financial knowledge base - try to answer any finance question
    response = this.answerFinancialQuestion(userMessage, message, user, financialData, tone, complexity, fullContext);
    
    // If we got a good response, use it
    if (response && !response.includes('Could you be more specific') && !response.includes('I want to make sure')) {
      // Check if we should also include budget summary or insights
      if (message.includes('budget') || message.includes('summary') || message.includes('overview')) {
        budgetSummary = this.generateBudgetSummary(financialData);
      }
      if (message.includes('spending') || message.includes('expense') || message.includes('insight')) {
        insights = this.generateSpendingInsights(financialData);
      }
      
      return {
        content: response,
        suggestions,
        budgetSummary,
        insights,
      };
    }

    // Fallback to general response
    response = this.generateGeneralResponse(userMessage, user, financialData, tone, complexity, conversationHistory);

    return {
      content: response,
      suggestions,
      budgetSummary,
      insights,
    };
  }

  private answerFinancialQuestion(
    userMessage: string,
    message: string,
    user: User | null,
    financialData: FinancialData,
    tone: string,
    complexity: string,
    fullContext: string
  ): string {
    // Comprehensive financial knowledge base
    const financialTerms: Record<string, (tone: string, complexity: string, user?: User | null, data?: FinancialData) => string> = {
      // Investment terms
      'sip': (t) => this.explainSIP(t, complexity),
      'systematic investment plan': (t) => this.explainSIP(t, complexity),
      'mutual fund': (t) => this.explainMutualFund(t, complexity),
      'mutual funds': (t) => this.explainMutualFund(t, complexity),
      'equity': (t) => this.explainEquity(t, complexity),
      'stocks': (t) => this.explainStocks(t, complexity),
      'stock market': (t) => this.explainStockMarket(t, complexity),
      'portfolio': (t) => this.explainPortfolio(t, complexity),
      'diversification': (t) => this.explainDiversification(t, complexity),
      'diversify': (t) => this.explainDiversification(t, complexity),
      'etf': (t) => this.explainETF(t, complexity),
      'exchange traded fund': (t) => this.explainETF(t, complexity),
      'index fund': (t) => this.explainIndexFund(t, complexity),
      'bond': (t) => this.explainBond(t, complexity),
      'bonds': (t) => this.explainBond(t, complexity),
      'fixed deposit': (t) => this.explainFixedDeposit(t, complexity),
      'fd': (t) => this.explainFixedDeposit(t, complexity),
      'recurring deposit': (t) => this.explainRD(t, complexity),
      'rd': (t) => this.explainRD(t, complexity),
      'ppf': (t) => this.explainPPF(t, complexity),
      'public provident fund': (t) => this.explainPPF(t, complexity),
      'nsc': (t) => this.explainNSC(t, complexity),
      'national savings certificate': (t) => this.explainNSC(t, complexity),
      
      // Banking & Credit
      'credit score': (t) => this.explainCreditScore(t, complexity),
      'credit card': (t) => this.explainCreditCard(t, complexity),
      'emi': (t) => this.explainEMI(t, complexity),
      'equated monthly installment': (t) => this.explainEMI(t, complexity),
      'interest rate': (t) => this.explainInterestRate(t, complexity),
      'compound interest': (t) => this.explainCompoundInterest(t, complexity),
      'simple interest': (t) => this.explainSimpleInterest(t, complexity),
      'credit': (t) => this.explainCredit(t, complexity),
      'debit': (t) => this.explainDebit(t, complexity),
      
      // Insurance
      'insurance': (t) => this.explainInsurance(t, complexity),
      'life insurance': (t) => this.explainLifeInsurance(t, complexity),
      'health insurance': (t) => this.explainHealthInsurance(t, complexity),
      'term insurance': (t) => this.explainTermInsurance(t, complexity),
      'premium': (t) => this.explainPremium(t, complexity),
      
      // Tax
      'tax': (t) => this.explainTax(t, complexity),
      'income tax': (t) => this.explainIncomeTax(t, complexity),
      'gst': (t) => this.explainGST(t, complexity),
      'deduction': (t) => this.explainDeduction(t, complexity),
      'tax deduction': (t) => this.explainDeduction(t, complexity),
      '80c': (t) => this.explain80C(t, complexity),
      'section 80c': (t) => this.explain80C(t, complexity),
      'itr': (t) => this.explainITR(t, complexity),
      'income tax return': (t) => this.explainITR(t, complexity),
      
      // Retirement
      'retirement': (t) => this.explainRetirement(t, complexity),
      '401k': (t) => this.explain401k(t, complexity),
      'ira': (t) => this.explainIRA(t, complexity),
      'pension': (t) => this.explainPension(t, complexity),
      'epf': (t) => this.explainEPF(t, complexity),
      'employee provident fund': (t) => this.explainEPF(t, complexity),
      
      // Real Estate
      'home loan': (t) => this.explainHomeLoan(t, complexity),
      'mortgage': (t) => this.explainMortgage(t, complexity),
      'real estate': (t) => this.explainRealEstate(t, complexity),
      'property': (t) => this.explainProperty(t, complexity),
      
      // Savings & Goals
      'emergency fund': (t) => this.explainEmergencyFund(t, complexity),
      'savings account': (t) => this.explainSavingsAccount(t, complexity),
      'current account': (t) => this.explainCurrentAccount(t, complexity),
      'financial goal': (t) => this.explainFinancialGoal(t, complexity),
      
      // Debt
      'debt': (t) => this.explainDebt(t, complexity),
      'loan': (t) => this.explainLoan(t, complexity),
      'personal loan': (t) => this.explainPersonalLoan(t, complexity),
      'education loan': (t) => this.explainEducationLoan(t, complexity),
      
      // Financial Planning
      'budget': (t, _, u, d) => {
        const summary = this.generateBudgetSummary(d || {} as FinancialData);
        return this.generateBudgetResponse(summary, t, complexity);
      },
      'financial planning': (t) => this.explainFinancialPlanning(t, complexity),
      'asset allocation': (t) => this.explainAssetAllocation(t, complexity),
      'risk': (t) => this.explainRisk(t, complexity),
      'inflation': (t) => this.explainInflation(t, complexity),
    };

    // Check for specific terms in the message
    for (const [term, handler] of Object.entries(financialTerms)) {
      if (message.includes(term)) {
        return handler(tone, complexity, user, financialData);
      }
    }

    // Check for question patterns
    if (message.includes('what is') || message.includes('what are') || message.includes('explain') || message.includes('tell me about')) {
      // Try to extract the topic
      const topic = this.extractTopic(message);
      if (topic) {
        for (const [term, handler] of Object.entries(financialTerms)) {
          if (topic.includes(term) || term.includes(topic)) {
            return handler(tone, complexity, user, financialData);
          }
        }
      }
    }

    // Investment strategy questions
    if (message.includes('where should i invest') || message.includes('where to invest') || message.includes('how to invest')) {
      return this.generateInvestmentAdvice(user, financialData, tone, complexity);
    }

    // Savings questions
    if (message.includes('how to save') || message.includes('how can i save') || message.includes('save more')) {
      return this.generateSavingsAdvice(user, financialData, tone, complexity);
    }

    // Budget questions
    if (message.includes('show my budget') || message.includes('my budget') || message.includes('budget summary')) {
      const summary = this.generateBudgetSummary(financialData);
      return this.generateBudgetResponse(summary, tone, complexity);
    }

    // Spending questions
    if (message.includes('spending') || message.includes('where does my money go') || message.includes('spending insights')) {
      const insights = this.generateSpendingInsights(financialData);
      return this.generateInsightsResponse(insights, tone, complexity);
    }

    // If it's a "what is" or "explain" question about finance, try to provide a helpful response
    if (message.includes('what is') || message.includes('what are') || message.includes('explain') || message.includes('tell me about')) {
      return this.generateFinancialExplanation(userMessage, message, tone, complexity);
    }

    // Default: return null to fall back to general response
    return '';
  }

  private generateFinancialExplanation(
    userMessage: string,
    message: string,
    tone: string,
    complexity: string
  ): string {
    // Extract the topic they're asking about
    const topic = this.extractTopic(message);
    
    if (!topic) {
      return '';
    }

    // Check if it's a general financial question
    const financialKeywords = [
      'finance', 'financial', 'money', 'investment', 'saving', 'spending',
      'budget', 'income', 'expense', 'wealth', 'capital', 'asset', 'liability',
      'revenue', 'profit', 'loss', 'return', 'yield', 'dividend', 'interest',
      'loan', 'credit', 'debt', 'equity', 'stock', 'share', 'bond', 'security',
      'fund', 'portfolio', 'market', 'trading', 'broker', 'account', 'bank',
      'insurance', 'tax', 'retirement', 'pension', 'annuity', 'estate',
      'mortgage', 'refinance', 'liquidity', 'volatility', 'leverage', 'margin'
    ];

    const isFinancialQuestion = financialKeywords.some(keyword => 
      message.includes(keyword) || topic.includes(keyword)
    );

    if (!isFinancialQuestion) {
      return '';
    }

    // Generate a helpful response for unknown financial terms
    let response = tone === 'casual'
      ? `Let me help you understand ${topic}!\n\n`
      : `Regarding ${topic}:\n\n`;

    response += `I want to provide you with accurate information. ${topic} is a financial term, and the specifics can vary based on context and location.\n\n`;

    if (topic.includes('investment') || topic.includes('invest') || topic.includes('fund') || topic.includes('stock') || topic.includes('equity')) {
      response += `This appears to be related to investing. Here are some general principles:\n`;
      response += `• Research before investing\n`;
      response += `• Diversify your portfolio\n`;
      response += `• Understand your risk tolerance\n`;
      response += `• Consider your time horizon\n`;
      response += `• Start with low-cost index funds if you're a beginner\n\n`;
      response += `Would you like me to explain a specific investment term like SIP, mutual funds, or stocks?`;
    } else if (topic.includes('loan') || topic.includes('debt') || topic.includes('credit') || topic.includes('borrow')) {
      response += `This seems related to borrowing or credit. Key points:\n`;
      response += `• Compare interest rates before borrowing\n`;
      response += `• Understand all terms and fees\n`;
      response += `• Only borrow what you can afford to repay\n`;
      response += `• Maintain a good credit score\n`;
      response += `• Pay off high-interest debt first\n\n`;
      response += `Would you like to know about specific loan types like personal loans, home loans, or how to manage debt?`;
    } else if (topic.includes('tax') || topic.includes('deduction') || topic.includes('income tax')) {
      response += `This appears to be a tax-related question. Important points:\n`;
      response += `• Tax laws vary by country and change frequently\n`;
      response += `• Use tax deductions and exemptions legally\n`;
      response += `• Keep records of all financial transactions\n`;
      response += `• Consider consulting a tax professional for specific advice\n\n`;
      response += `Would you like to know about tax deductions, Section 80C, or filing tax returns?`;
    } else if (topic.includes('insurance') || topic.includes('premium') || topic.includes('coverage')) {
      response += `This seems related to insurance. Key considerations:\n`;
      response += `• Choose coverage based on your needs and risk\n`;
      response += `• Compare premiums and benefits\n`;
      response += `• Understand deductibles and coverage limits\n`;
      response += `• Review and update policies regularly\n\n`;
      response += `Would you like to know about life insurance, health insurance, or term insurance?`;
    } else if (topic.includes('saving') || topic.includes('emergency') || topic.includes('fund')) {
      response += `This appears related to savings. Important points:\n`;
      response += `• Build an emergency fund (3-6 months of expenses)\n`;
      response += `• Automate your savings\n`;
      response += `• Aim to save at least 10-20% of your income\n`;
      response += `• Save for specific goals separately\n\n`;
      response += `Would you like to know about emergency funds, savings strategies, or setting financial goals?`;
    } else if (topic.includes('retirement') || topic.includes('pension') || topic.includes('401k') || topic.includes('ira')) {
      response += `This seems related to retirement planning. Key steps:\n`;
      response += `• Start saving early for retirement\n`;
      response += `• Contribute to employer-sponsored plans (401k, 403b)\n`;
      response += `• Consider IRAs (Traditional or Roth)\n`;
      response += `• Aim to save 10-15% of income for retirement\n`;
      response += `• Diversify your retirement investments\n\n`;
      response += `Would you like to know about 401(k), IRA, or general retirement planning?`;
    } else {
      response += `Here are some general financial principles that might help:\n`;
      response += `• Create and stick to a budget\n`;
      response += `• Build an emergency fund\n`;
      response += `• Pay off high-interest debt\n`;
      response += `• Invest for long-term goals\n`;
      response += `• Protect yourself with insurance\n`;
      response += `• Plan for retirement early\n\n`;
      response += `Could you be more specific about what aspect of ${topic} you'd like to understand?`;
    }

    return response;
  }

  private extractTopic(message: string): string {
    // Try to extract the topic from "what is X" or "explain X" patterns
    const patterns = [
      /what is (?:a |an |the )?([a-z\s]+?)(?:\?|$|\.)/i,
      /what are (?:a |an |the )?([a-z\s]+?)(?:\?|$|\.)/i,
      /explain ([a-z\s]+?)(?:\?|$|\.)/i,
      /tell me about ([a-z\s]+?)(?:\?|$|\.)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toLowerCase();
      }
    }

    return '';
  }

  private generateBudgetResponse(summary: any, tone: string, complexity: string): string {
    const greeting = tone === 'casual' ? 'Here is your budget summary:' : tone === 'professional' ? 'Here is your budget summary:' : 'Your budget overview:';
    
    let response = `${greeting}\n\n`;
    response += `💰 Monthly Income: $${summary.monthlyIncome.toLocaleString()}\n`;
    response += `💸 Monthly Expenses: $${summary.monthlyExpenses.toLocaleString()}\n`;
    response += `💵 Monthly Savings: $${summary.monthlySavings.toLocaleString()}\n`;
    response += `📊 Savings Rate: ${summary.savingsRate}%\n\n`;

    if (complexity === 'detailed') {
      response += `Current Balance: $${summary.totalBalance.toLocaleString()}\n`;
      if (Object.keys(summary.categoryBreakdown).length > 0) {
        response += `\nExpense Categories:\n`;
        Object.entries(summary.categoryBreakdown).forEach(([cat, amount]: [string, any]) => {
          const percentage = ((amount / summary.monthlyExpenses) * 100).toFixed(1);
          response += `  • ${cat}: $${amount.toLocaleString()} (${percentage}%)\n`;
        });
      }
    }

    if (parseFloat(summary.savingsRate) < 10) {
      response += `\n💡 Tip: Try to save at least 10% of your income each month for better financial health.`;
    }

    return response;
  }

  private generateInsightsResponse(insights: any, tone: string, complexity: string): string {
    let response = tone === 'casual' 
      ? 'Here are your spending insights! 📊\n\n'
      : 'Spending Analysis:\n\n';

    if (insights.trends.length > 0) {
      response += '📈 Trends:\n';
      insights.trends.forEach((trend: string) => {
        response += `  • ${trend}\n`;
      });
      response += '\n';
    }

    if (insights.anomalies.length > 0) {
      response += '⚠️ Items to Review:\n';
      insights.anomalies.forEach((anomaly: string) => {
        response += `  • ${anomaly}\n`;
      });
      response += '\n';
    }

    if (insights.recommendations.length > 0) {
      response += '💡 Recommendations:\n';
      insights.recommendations.forEach((rec: string) => {
        response += `  • ${rec}\n`;
      });
    }

    return response;
  }

  private generateSavingsAdvice(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
    const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;

    let response = tone === 'casual'
      ? 'Here is some savings advice! 💰\n\n'
      : 'Savings Recommendations:\n\n';

    if (savingsRate < 10) {
      response += `Your current savings rate is ${savingsRate.toFixed(1)}%. The general recommendation is to save at least 10-20% of your income.`;
    } else if (savingsRate < 20) {
      response += `Good job! You are saving ${savingsRate.toFixed(1)}% of your income. Consider increasing it to 20% for better financial security.`;
    } else {
      response += `Excellent! You are saving ${savingsRate.toFixed(1)}% of your income. Keep up the great work!`;
    }

    response += `\n\nYou are currently saving $${monthlySavings.toLocaleString()} per month.`;

    if (complexity === 'detailed') {
      response += `\n\nHere are some strategies to boost your savings:\n`;
      response += `1. Automate your savings transfers\n`;
      response += `2. Review and reduce unnecessary expenses\n`;
      response += `3. Create a separate savings account for goals\n`;
      response += `4. Track your spending to identify opportunities`;
    }

    return response;
  }

  private generateSavingsSuggestions(financialData: FinancialData): string[] {
    const suggestions = [];
    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;

    if (savingsRate < 10) {
      suggestions.push('Set up automatic transfers to savings');
      suggestions.push('Review subscription services and cancel unused ones');
      suggestions.push('Create a budget to track expenses');
    }

    suggestions.push('Build an emergency fund (3-6 months of expenses)');
    suggestions.push('Consider high-yield savings accounts');

    return suggestions;
  }

  private generateInvestmentAdvice(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Investment advice! 📈\n\n'
      : 'Investment Recommendations:\n\n';

    response += `Before investing, ensure you have:\n`;
    response += `1. An emergency fund (3-6 months of expenses)\n`;
    response += `2. High-interest debt paid off\n`;
    response += `3. A stable income source\n\n`;

    if (financialData.totalBalance < financialData.monthlyExpenses * 6) {
      response += `I recommend building your emergency fund first before investing.`;
    } else {
      response += `Consider starting with:\n`;
      response += `• Index funds or ETFs for diversification\n`;
      response += `• 401(k) or similar retirement accounts if available\n`;
      response += `• Dollar-cost averaging strategy\n\n`;
      if (complexity === 'detailed') {
        response += `Remember: All investments carry risk. Consider your risk tolerance and time horizon.`;
      }
    }

    return response;
  }

  private generateTaxAdvice(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Tax tips! 📋\n\n'
      : 'Tax Planning Advice:\n\n';

    response += `General tax-saving strategies:\n\n`;
    response += `1. Maximize retirement contributions (401(k), IRA)\n`;
    response += `2. Keep receipts for deductible expenses\n`;
    response += `3. Consider tax-loss harvesting for investments\n`;
    response += `4. Take advantage of tax credits and deductions\n\n`;

    if (user?.demographic?.type === 'student') {
      response += `As a student, you may qualify for education credits and deductions. Keep track of tuition and education expenses.`;
    } else if (user?.demographic?.type === 'professional') {
      response += `As a professional, consider contributing to retirement accounts and keeping track of work-related expenses.`;
    }

      response += `\n\nNote: I am providing general advice. Consult a tax professional for personalized guidance.`;

    return response;
  }

  private generateGoalsAdvice(user: User | null, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Let us talk about goals! 🎯\n\n'
      : 'Financial Goal Planning:\n\n';

    response += `Setting and achieving financial goals:\n\n`;
    response += `1. Make goals SMART (Specific, Measurable, Achievable, Relevant, Time-bound)\n`;
    response += `2. Break large goals into smaller milestones\n`;
    response += `3. Track progress regularly\n`;
    response += `4. Adjust goals as your situation changes\n\n`;

    if (user?.financialGoals && user.financialGoals.length > 0) {
      response += `Your current goals:\n`;
      user.financialGoals.forEach((goal, index) => {
        response += `${index + 1}. ${goal}\n`;
      });
    } else {
      response += `You have not set any financial goals yet. Would you like help creating some?`;
    }

    return response;
  }

  private generateGeneralResponse(
    userMessage: string,
    user: User | null,
    financialData: FinancialData,
    tone: string,
    complexity: string,
    conversationHistory: ChatMessage[] = []
  ): string {
    const greetings = tone === 'casual' 
      ? ['Hey!', 'Hi there!', 'What is up?']
      : ['Hello!', 'Greetings!', 'Good day!'];

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Check if this is a continuation of a conversation
    const isContinuation = conversationHistory.length > 0;
    const recentTopics = conversationHistory.slice(-3).map(m => m.content.toLowerCase()).join(' ');
    const message = userMessage.toLowerCase();

    let response = '';

    // Greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('hey') || message === 'hi' || message === 'hello') {
      const userName = user?.fullName ? `, ${user.fullName.split(' ')[0]}` : '';
      response = `${greeting}${userName}! I am FINOVA, your personal financial assistant.\n\n`;
      response += `I can help you with:\n`;
      response += `• Budget planning and summaries\n`;
      response += `• Savings strategies and goals\n`;
      response += `• Investment advice\n`;
      response += `• Tax planning\n`;
      response += `• Spending insights and analysis\n`;
      response += `• Debt management\n`;
      response += `• Retirement planning\n\n`;
      response += `What would you like to know about your finances today?`;
    } 
    // Thank you responses
    else if (message.includes('thank') || message.includes('thanks')) {
      response = `You are welcome! I am here anytime you need financial advice. Is there anything else I can help you with?`;
    }
    // Help requests
    else if (message.includes('help') || message === 'help') {
      response = `I can help you with various financial topics!\n\n`;
      response += `Try asking me:\n`;
      response += `• "Show me my budget summary"\n`;
      response += `• "How much am I spending?"\n`;
      response += `• "How can I save more money?"\n`;
      response += `• "What should I invest in?"\n`;
      response += `• "Give me spending insights"\n`;
      response += `• "How is my financial health?"\n\n`;
      response += `Or ask me any specific financial question!`;
    }
    // Continuation responses
    else if (isContinuation && recentTopics) {
      response = `${greeting} `;
      
      if (recentTopics.includes('budget') || recentTopics.includes('summary')) {
        response += `Continuing on your budget discussion. `;
      } else if (recentTopics.includes('save') || recentTopics.includes('saving')) {
        response += `Regarding savings, `;
      } else if (recentTopics.includes('invest') || recentTopics.includes('investment')) {
        response += `About investments, `;
      } else if (recentTopics.includes('spending') || recentTopics.includes('expense')) {
        response += `On spending, `;
      }
      
      response += `I can help you with various financial topics. Could you be more specific? For example:\n`;
      response += `• "Show my budget"\n`;
      response += `• "How can I save more?"\n`;
      response += `• "Investment advice"\n`;
      response += `• "Spending analysis"`;
    } 
    // Default response with helpful suggestions
    else {
      response = `${greeting} I am here to help with your financial questions!\n\n`;
      response += `I want to make sure I give you the best answer. Could you be more specific? For example:\n\n`;
      response += `• Ask about your budget: "Show my budget summary" or "How much am I spending?"\n`;
      response += `• Get savings advice: "How can I save more money?" or "What is a good savings rate?"\n`;
      response += `• Investment help: "Where should I invest?" or "Investment advice for beginners"\n`;
      response += `• Spending analysis: "Show my spending insights" or "Where does my money go?"\n`;
      response += `• Financial health: "How am I doing financially?" or "Am I on track?"\n\n`;
      response += `What specific financial topic can I help you with?`;
    }

    return response;
  }

  private generateDebtAdvice(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Let us talk about debt management!\n\n'
      : 'Debt Management Advice:\n\n';

    response += `Effective debt management strategies:\n\n`;
    response += `1. List all your debts with interest rates\n`;
    response += `2. Prioritize high-interest debt (debt avalanche method)\n`;
    response += `3. Or pay off smallest debts first (debt snowball method)\n`;
    response += `4. Consider debt consolidation if applicable\n`;
    response += `5. Make minimum payments on all debts\n`;
    response += `6. Allocate extra funds to priority debt\n\n`;

    if (financialData.monthlyExpenses > financialData.monthlyIncome * 0.5) {
      response += `Based on your current expenses, you may want to review your spending to free up money for debt repayment.`;
    } else {
      const available = financialData.monthlyIncome - financialData.monthlyExpenses;
      response += `You have about $${available.toLocaleString()} available monthly that could go toward debt repayment.`;
    }

    return response;
  }

  private generateRetirementAdvice(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Retirement planning! Let us get you set up.\n\n'
      : 'Retirement Planning Advice:\n\n';

    response += `Key retirement planning steps:\n\n`;
    response += `1. Start saving early - time is your biggest advantage\n`;
    response += `2. Contribute to employer-sponsored plans (401k, 403b) with matching\n`;
    response += `3. Open an IRA (Traditional or Roth)\n`;
    response += `4. Aim to save 10-15% of your income for retirement\n`;
    response += `5. Diversify your investments\n`;
    response += `6. Consider your retirement timeline\n\n`;

    if (user?.demographic?.type === 'student') {
      response += `As a student, starting early gives you a huge advantage. Even small amounts now compound significantly over time.`;
    } else if (user?.demographic?.type === 'professional') {
      const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;
      response += `With your current savings rate, you are setting a good foundation. Consider increasing contributions to retirement accounts.`;
    }

    return response;
  }

  private generateFinancialHealthCheck(user: User | null, financialData: FinancialData, tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Let us check your financial health!\n\n'
      : 'Financial Health Assessment:\n\n';

    const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
    const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;
    const emergencyFundMonths = financialData.totalBalance / financialData.monthlyExpenses;

    response += `Here is how you are doing:\n\n`;
    response += `💰 Monthly Income: $${financialData.monthlyIncome.toLocaleString()}\n`;
    response += `💸 Monthly Expenses: $${financialData.monthlyExpenses.toLocaleString()}\n`;
    response += `💵 Monthly Savings: $${monthlySavings.toLocaleString()} (${savingsRate.toFixed(1)}%)\n`;
    response += `🏦 Current Balance: $${financialData.totalBalance.toLocaleString()}\n`;
    response += `🛡️ Emergency Fund: ${emergencyFundMonths.toFixed(1)} months of expenses\n\n`;

    // Health assessment
    if (savingsRate >= 20) {
      response += `✅ Excellent! You are saving 20% or more, which is outstanding.\n`;
    } else if (savingsRate >= 10) {
      response += `✅ Good! You are saving 10% or more, which is a solid foundation.\n`;
    } else {
      response += `⚠️ Your savings rate is below 10%. Consider increasing it gradually.\n`;
    }

    if (emergencyFundMonths >= 6) {
      response += `✅ Great emergency fund! You have 6+ months covered.\n`;
    } else if (emergencyFundMonths >= 3) {
      response += `✅ Good emergency fund. Aim for 6 months for better security.\n`;
    } else {
      response += `⚠️ Build your emergency fund to 3-6 months of expenses.\n`;
    }

    return response;
  }

  private answerSpecificQuestion(
    userMessage: string,
    user: User | null,
    financialData: FinancialData,
    tone: string,
    complexity: string
  ): string {
    const message = userMessage.toLowerCase();
    let response = '';

    if (message.includes('how much') && message.includes('spend')) {
      response = `You are currently spending $${financialData.monthlyExpenses.toLocaleString()} per month.`;
    } else if (message.includes('how much') && (message.includes('earn') || message.includes('income'))) {
      response = `Your monthly income is $${financialData.monthlyIncome.toLocaleString()}.`;
    } else if (message.includes('how much') && (message.includes('save') || message.includes('left'))) {
      const savings = financialData.monthlyIncome - financialData.monthlyExpenses;
      response = `You are saving $${savings.toLocaleString()} per month, which is ${((savings / financialData.monthlyIncome) * 100).toFixed(1)}% of your income.`;
    } else if (message.includes('what is my') && message.includes('balance')) {
      response = `Your current balance is $${financialData.totalBalance.toLocaleString()}.`;
    } else if (message.includes('what is my') && message.includes('savings rate')) {
      const rate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
      response = `Your savings rate is ${rate.toFixed(1)}%. `;
      if (rate < 10) {
        response += `Consider aiming for at least 10-20% for better financial health.`;
      } else if (rate < 20) {
        response += `That is good! Consider increasing to 20% for optimal savings.`;
      } else {
        response += `Excellent! You are saving at an optimal rate.`;
      }
    } else {
      response = `I understand you are asking about your finances. Could you be more specific? For example:\n`;
      response += `• "How much am I spending?"\n`;
      response += `• "What is my savings rate?"\n`;
      response += `• "How much do I earn?"`;
    }

    return response;
  }

  private explainSIP(tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'SIP stands for Systematic Investment Plan!\n\n'
      : 'SIP (Systematic Investment Plan):\n\n';

    response += `SIP is a method of investing in mutual funds where you invest a fixed amount regularly (monthly, quarterly, etc.) instead of a lump sum.\n\n`;

    response += `Key Benefits:\n`;
    response += `• Rupee Cost Averaging - You buy more units when prices are low and fewer when prices are high\n`;
    response += `• Disciplined Investing - Regular investments build the habit of saving\n`;
    response += `• Small Amounts - You can start with as little as $500-1000 per month\n`;
    response += `• Flexibility - You can increase, decrease, pause, or stop anytime\n`;
    response += `• Power of Compounding - Your money grows over time through reinvestment\n\n`;

    if (complexity === 'detailed') {
      response += `How it works:\n`;
      response += `1. Choose a mutual fund scheme\n`;
      response += `2. Decide the amount and frequency (usually monthly)\n`;
      response += `3. Set up auto-debit from your bank account\n`;
      response += `4. The fund house automatically invests the amount on a fixed date\n`;
      response += `5. You accumulate units in the fund over time\n\n`;
      response += `SIP is ideal for long-term goals like retirement, children's education, or buying a house.`;
    } else {
      response += `SIP is perfect for long-term goals like retirement, education, or buying a house. Start small and invest regularly!`;
    }

    return response;
  }

  // Investment Terms
  private explainMutualFund(tone: string, complexity: string): string {
    let response = tone === 'casual'
      ? 'Mutual funds are a great investment option!\n\n'
      : 'Mutual Funds:\n\n';
    response += `A mutual fund pools money from many investors to buy a diversified portfolio of stocks, bonds, or other securities.\n\n`;
    response += `Benefits: Professional management, diversification, liquidity, and low minimum investment.\n`;
    response += `Types: Equity funds (stocks), Debt funds (bonds), Hybrid funds (mix), and Index funds.\n`;
    return response;
  }

  private explainEquity(tone: string, complexity: string): string {
    let response = `Equity represents ownership in a company. When you buy stocks, you own a portion of that company.\n\n`;
    response += `Equity investments can offer higher returns but come with higher risk. Suitable for long-term goals.\n`;
    return response;
  }

  private explainStocks(tone: string, complexity: string): string {
    let response = `Stocks (or shares) represent ownership in a company. Buying stocks makes you a shareholder.\n\n`;
    response += `Stock prices fluctuate based on company performance and market conditions. Research before investing.\n`;
    return response;
  }

  private explainStockMarket(tone: string, complexity: string): string {
    let response = `The stock market is where buyers and sellers trade stocks of publicly listed companies.\n\n`;
    response += `Major indices track market performance. Investing in stocks requires understanding market trends and company fundamentals.\n`;
    return response;
  }

  private explainPortfolio(tone: string, complexity: string): string {
    let response = `A portfolio is your collection of investments (stocks, bonds, mutual funds, etc.).\n\n`;
    response += `A well-diversified portfolio spreads risk across different asset classes and sectors.\n`;
    return response;
  }

  private explainDiversification(tone: string, complexity: string): string {
    let response = `Diversification means spreading investments across different assets to reduce risk.\n\n`;
    response += `Don't put all eggs in one basket. Invest in stocks, bonds, real estate, and other assets.\n`;
    return response;
  }

  private explainETF(tone: string, complexity: string): string {
    let response = `ETF (Exchange Traded Fund) is a basket of securities that trades on stock exchanges like a stock.\n\n`;
    response += `ETFs combine benefits of mutual funds (diversification) with stocks (trading flexibility). Lower fees than mutual funds.\n`;
    return response;
  }

  private explainIndexFund(tone: string, complexity: string): string {
    let response = `An index fund tracks a market index (like S&P 500) by holding the same securities in the same proportions.\n\n`;
    response += `Low fees, passive management, and broad market exposure. Great for beginners.\n`;
    return response;
  }

  private explainBond(tone: string, complexity: string): string {
    let response = `A bond is a loan you give to a company or government. They pay you interest and return the principal.\n\n`;
    response += `Bonds are generally safer than stocks but offer lower returns. Good for conservative investors.\n`;
    return response;
  }

  private explainFixedDeposit(tone: string, complexity: string): string {
    let response = `Fixed Deposit (FD) is a bank deposit with fixed interest rate and maturity date.\n\n`;
    response += `Safe, guaranteed returns, but lower than market investments. Good for short-term goals.\n`;
    return response;
  }

  private explainRD(tone: string, complexity: string): string {
    let response = `Recurring Deposit (RD) lets you invest a fixed amount monthly for a fixed period.\n\n`;
    response += `Disciplined savings with guaranteed returns. Similar to FD but with monthly contributions.\n`;
    return response;
  }

  private explainPPF(tone: string, complexity: string): string {
    let response = `PPF (Public Provident Fund) is a long-term savings scheme with tax benefits.\n\n`;
    response += `15-year lock-in, tax deductions under Section 80C, and tax-free interest. Great for retirement planning.\n`;
    return response;
  }

  private explainNSC(tone: string, complexity: string): string {
    let response = `NSC (National Savings Certificate) is a fixed-income investment scheme.\n\n`;
    response += `5-year maturity, tax benefits under Section 80C, and guaranteed returns backed by government.\n`;
    return response;
  }

  // Banking & Credit
  private explainCreditScore(tone: string, complexity: string): string {
    let response = `Credit score (300-850) reflects your creditworthiness based on payment history and debt.\n\n`;
    response += `Higher scores (700+) get better loan rates. Pay bills on time, keep debt low, and check your report regularly.\n`;
    return response;
  }

  private explainCreditCard(tone: string, complexity: string): string {
    let response = `Credit cards let you borrow money up to a limit. Pay full balance monthly to avoid interest.\n\n`;
    response += `Use responsibly: pay on time, avoid minimum payments, and use rewards wisely.\n`;
    return response;
  }

  private explainEMI(tone: string, complexity: string): string {
    let response = `EMI (Equated Monthly Installment) is the fixed monthly payment for loans.\n\n`;
    response += `Includes principal and interest. Lower EMI = longer tenure = more total interest. Find the right balance.\n`;
    return response;
  }

  private explainInterestRate(tone: string, complexity: string): string {
    let response = `Interest rate is the cost of borrowing money or return on savings.\n\n`;
    response += `APR (Annual Percentage Rate) shows true borrowing cost. Compare rates before taking loans.\n`;
    return response;
  }

  private explainCompoundInterest(tone: string, complexity: string): string {
    let response = `Compound interest earns interest on interest, making money grow faster over time.\n\n`;
    response += `The longer you invest, the more compounding benefits you get. Start early for maximum growth!\n`;
    return response;
  }

  private explainSimpleInterest(tone: string, complexity: string): string {
    let response = `Simple interest is calculated only on the principal amount.\n\n`;
    response += `Unlike compound interest, it doesn't earn interest on previous interest. Used for short-term loans.\n`;
    return response;
  }

  private explainCredit(tone: string, complexity: string): string {
    let response = `Credit is the ability to borrow money or access goods/services before payment.\n\n`;
    response += `Use credit wisely: build good credit history, pay on time, and avoid excessive debt.\n`;
    return response;
  }

  private explainDebit(tone: string, complexity: string): string {
    let response = `Debit means money is taken out of your account immediately.\n\n`;
    response += `Debit cards use your own money, unlike credit cards which borrow money.\n`;
    return response;
  }

  // Insurance
  private explainInsurance(tone: string, complexity: string): string {
    let response = `Insurance protects you financially from unexpected events in exchange for premiums.\n\n`;
    response += `Types: Life, health, auto, home insurance. Choose coverage based on your needs and risk.\n`;
    return response;
  }

  private explainLifeInsurance(tone: string, complexity: string): string {
    let response = `Life insurance provides financial protection to your family if you pass away.\n\n`;
    response += `Term insurance is pure protection, while whole life combines insurance with savings.\n`;
    return response;
  }

  private explainHealthInsurance(tone: string, complexity: string): string {
    let response = `Health insurance covers medical expenses. Essential for protection against high healthcare costs.\n\n`;
    response += `Compare plans, check coverage, deductibles, and network hospitals before choosing.\n`;
    return response;
  }

  private explainTermInsurance(tone: string, complexity: string): string {
    let response = `Term insurance provides pure life coverage for a fixed period at low premiums.\n\n`;
    response += `No savings component, just protection. Best for those who need maximum coverage at minimum cost.\n`;
    return response;
  }

  private explainPremium(tone: string, complexity: string): string {
    let response = `Premium is the amount you pay regularly (monthly/annually) for insurance coverage.\n\n`;
    response += `Higher premiums often mean better coverage. Compare premiums and benefits before choosing.\n`;
    return response;
  }

  // Tax
  private explainTax(tone: string, complexity: string): string {
    return this.generateTaxAdvice(null, {} as FinancialData, tone, complexity);
  }

  private explainIncomeTax(tone: string, complexity: string): string {
    let response = `Income tax is a tax on your earnings. Rates vary by income level and country.\n\n`;
    response += `Use deductions and exemptions to reduce taxable income legally.\n`;
    return response;
  }

  private explainGST(tone: string, complexity: string): string {
    let response = `GST (Goods and Services Tax) is a consumption tax on goods and services.\n\n`;
    response += `Paid by consumers but collected by businesses. Different rates for different product categories.\n`;
    return response;
  }

  private explainDeduction(tone: string, complexity: string): string {
    let response = `Tax deductions reduce your taxable income, lowering your tax bill.\n\n`;
    response += `Common deductions: Section 80C (investments), medical expenses, home loan interest, education expenses.\n`;
    return response;
  }

  private explain80C(tone: string, complexity: string): string {
    let response = `Section 80C allows tax deduction up to $1,500 (or equivalent) per year on eligible investments.\n\n`;
    response += `Eligible: PPF, ELSS, NSC, life insurance premiums, home loan principal, children's tuition fees.\n`;
    return response;
  }

  private explainITR(tone: string, complexity: string): string {
    let response = `ITR (Income Tax Return) is a form declaring your income and taxes paid for the year.\n\n`;
    response += `File before deadline to avoid penalties. Keep documents ready and use e-filing for convenience.\n`;
    return response;
  }

  // Retirement
  private explainRetirement(tone: string, complexity: string): string {
    return this.generateRetirementAdvice(null, {} as FinancialData, tone, complexity);
  }

  private explain401k(tone: string, complexity: string): string {
    let response = `401(k) is a US employer-sponsored retirement plan. Contributions are pre-tax.\n\n`;
    response += `Many employers match contributions - take full advantage! Maximum contribution limits apply.\n`;
    return response;
  }

  private explainIRA(tone: string, complexity: string): string {
    let response = `IRA (Individual Retirement Account) is a personal retirement savings account.\n\n`;
    response += `Traditional IRA: tax-deferred. Roth IRA: post-tax contributions, tax-free withdrawals. Choose based on your situation.\n`;
    return response;
  }

  private explainPension(tone: string, complexity: string): string {
    let response = `Pension is a regular payment after retirement, typically from employer or government.\n\n`;
    response += `Plan early for retirement. Consider pension plans, 401(k), IRA, and other retirement accounts.\n`;
    return response;
  }

  private explainEPF(tone: string, complexity: string): string {
    let response = `EPF (Employee Provident Fund) is a retirement savings scheme for employees.\n\n`;
    response += `Both employer and employee contribute. Long-term savings with tax benefits and guaranteed returns.\n`;
    return response;
  }

  // Real Estate
  private explainHomeLoan(tone: string, complexity: string): string {
    let response = `Home loan helps you buy property by borrowing money from a bank.\n\n`;
    response += `Compare interest rates, processing fees, and tenure. Use EMI calculators to plan payments.\n`;
    return response;
  }

  private explainMortgage(tone: string, complexity: string): string {
    return this.explainHomeLoan(tone, complexity);
  }

  private explainRealEstate(tone: string, complexity: string): string {
    let response = `Real estate includes land and buildings. Can be residential, commercial, or land.\n\n`;
    response += `Real estate can appreciate but requires maintenance. Consider location, market trends, and your goals.\n`;
    return response;
  }

  private explainProperty(tone: string, complexity: string): string {
    return this.explainRealEstate(tone, complexity);
  }

  // Savings & Goals
  private explainEmergencyFund(tone: string, complexity: string): string {
    let response = `Emergency fund is 3-6 months of expenses saved for unexpected situations.\n\n`;
    response += `Keep it in a separate, easily accessible account. Don't use it for investments or expenses.\n`;
    return response;
  }

  private explainSavingsAccount(tone: string, complexity: string): string {
    let response = `Savings account earns interest on your deposits while keeping money accessible.\n\n`;
    response += `Low interest rates but liquid. Good for emergency funds and short-term savings.\n`;
    return response;
  }

  private explainCurrentAccount(tone: string, complexity: string): string {
    let response = `Current account is for business transactions with no interest but unlimited transactions.\n\n`;
    response += `Used by businesses for daily operations. Different from savings accounts.\n`;
    return response;
  }

  private explainFinancialGoal(tone: string, complexity: string): string {
    return this.generateGoalsAdvice(null, tone, complexity);
  }

  // Debt
  private explainDebt(tone: string, complexity: string): string {
    return this.generateDebtAdvice(null, {} as FinancialData, tone, complexity);
  }

  private explainLoan(tone: string, complexity: string): string {
    let response = `A loan is borrowed money that must be repaid with interest over time.\n\n`;
    response += `Types: Personal, home, car, education loans. Compare rates, tenure, and terms before borrowing.\n`;
    return response;
  }

  private explainPersonalLoan(tone: string, complexity: string): string {
    let response = `Personal loan is unsecured credit for personal needs without collateral.\n\n`;
    response += `Higher interest rates than secured loans. Use only for essential needs and pay off quickly.\n`;
    return response;
  }

  private explainEducationLoan(tone: string, complexity: string): string {
    let response = `Education loan helps finance education expenses. Often has tax benefits.\n\n`;
    response += `Lower interest rates, longer repayment periods. Research scholarships and grants first.\n`;
    return response;
  }

  // Financial Planning
  private explainFinancialPlanning(tone: string, complexity: string): string {
    let response = `Financial planning is managing money to achieve life goals through budgeting, saving, and investing.\n\n`;
    response += `Steps: Set goals, create budget, build emergency fund, invest for growth, protect with insurance, plan retirement.\n`;
    return response;
  }

  private explainAssetAllocation(tone: string, complexity: string): string {
    let response = `Asset allocation is dividing investments among different asset classes (stocks, bonds, cash).\n\n`;
    response += `Balance risk and return based on age, goals, and risk tolerance. Rebalance periodically.\n`;
    return response;
  }

  private explainRisk(tone: string, complexity: string): string {
    let response = `Investment risk is the possibility of losing money. Higher risk = higher potential returns.\n\n`;
    response += `Assess your risk tolerance: Conservative (bonds, FDs), Moderate (balanced funds), Aggressive (stocks, equity).\n`;
    return response;
  }

  private explainInflation(tone: string, complexity: string): string {
    let response = `Inflation is the increase in prices over time, reducing purchasing power.\n\n`;
    response += `Your money loses value if returns don't beat inflation. Invest in growth assets to beat inflation.\n`;
    return response;
  }
}

export const aiService = new AIService();

