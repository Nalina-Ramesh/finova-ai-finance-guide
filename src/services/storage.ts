// Local storage service for all application data

export interface User {
  id: string;
  email: string;
  fullName: string;
  password?: string;
  demographic?: {
    type: 'student' | 'professional' | 'retiree' | 'entrepreneur';
    age?: number;
    location?: string;
    occupation?: string;
  };
  financialGoals?: string[];
  createdAt: string;
}

export interface FinancialData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  expenseBreakdown: {
    category: string;
    amount: number;
    date: string;
  }[];
  incomeHistory: {
    date: string;
    amount: number;
  }[];
  expenseHistory: {
    date: string;
    amount: number;
    category: string;
  }[];
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

class StorageService {
  private readonly USER_KEY = 'finova_user';
  private readonly USERS_KEY = 'finova_users';
  private readonly SESSION_KEY = 'finova_session_user';
  private readonly FINANCIAL_DATA_KEY = 'finova_financial_data';
  private readonly SAVINGS_GOALS_KEY = 'finova_savings_goals';
  private readonly CHAT_MESSAGES_KEY = 'finova_chat_messages';
  private listeners: Array<() => void> = [];

  // Change subscriptions
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    try {
      this.listeners.forEach((l) => l());
    } catch {
      // no-op
    }
  }

  // User management (multi-user support)
  private getAllUsers(): User[] {
    const usersStr = localStorage.getItem(this.USERS_KEY);
    if (!usersStr) return [];
    try {
      return JSON.parse(usersStr);
    } catch {
      return [];
    }
  }

  private saveAllUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    this.notifyChange();
  }

  getCurrentUser(): User | null {
    const activeUserId = this.getActiveUserId();
    if (!activeUserId) return null;
    const users = this.getAllUsers();
    return users.find((u) => u.id === activeUserId) || null;
  }

  getUserByEmail(email: string): User | null {
    const users = this.getAllUsers();
    return users.find((u) => u.email === email) || null;
  }

  addUser(user: User): void {
    const users = this.getAllUsers();
    users.push(user);
    this.saveAllUsers(users);
  }

  updateUser(updates: Partial<User>): void {
    const users = this.getAllUsers();
    const activeUserId = this.getActiveUserId();
    if (!activeUserId) return;
    const index = users.findIndex((u) => u.id === activeUserId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this.saveAllUsers(users);
    }
  }

  // Session management
  hasSession(): boolean {
    return !!this.getActiveUserId();
  }

  getActiveUserId(): string | null {
    return localStorage.getItem(this.SESSION_KEY);
  }

  setActiveUser(userId: string | null): void {
    if (userId) {
      localStorage.setItem(this.SESSION_KEY, userId);
    } else {
      localStorage.removeItem(this.SESSION_KEY);
    }
    this.notifyChange();
  }

  private getUserScopedKey(baseKey: string): string {
    const userId = this.getActiveUserId();
    return userId ? `${baseKey}_${userId}` : baseKey;
  }

  // Financial data
  getFinancialData(): FinancialData {
    const key = this.getUserScopedKey(this.FINANCIAL_DATA_KEY);
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      try {
        return JSON.parse(dataStr);
      } catch {
        // Return default if parse fails
      }
    }
    // Default financial data
    return {
      totalBalance: 10000,
      monthlyIncome: 2000,
      monthlyExpenses: 500,
      expenseBreakdown: [],
      incomeHistory: [],
      expenseHistory: [],
    };
  }

  saveFinancialData(data: FinancialData): void {
    const key = this.getUserScopedKey(this.FINANCIAL_DATA_KEY);
    localStorage.setItem(key, JSON.stringify(data));
    this.notifyChange();
  }

  updateFinancialData(updates: Partial<FinancialData>): void {
    const current = this.getFinancialData();
    const updated = { ...current, ...updates };
    this.saveFinancialData(updated);
  }

  // Savings goals
  getSavingsGoals(): SavingsGoal[] {
    const key = this.getUserScopedKey(this.SAVINGS_GOALS_KEY);
    const goalsStr = localStorage.getItem(key);
    if (goalsStr) {
      try {
        return JSON.parse(goalsStr);
      } catch {
        return [];
      }
    }
    return [];
  }

  saveSavingsGoals(goals: SavingsGoal[]): void {
    const key = this.getUserScopedKey(this.SAVINGS_GOALS_KEY);
    localStorage.setItem(key, JSON.stringify(goals));
    this.notifyChange();
  }

  addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>): SavingsGoal {
    const goals = this.getSavingsGoals();
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    goals.push(newGoal);
    this.saveSavingsGoals(goals);
    return newGoal;
  }

  updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): void {
    const goals = this.getSavingsGoals();
    const index = goals.findIndex((g) => g.id === id);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updates };
      this.saveSavingsGoals(goals);
    }
  }

  deleteSavingsGoal(id: string): void {
    const goals = this.getSavingsGoals();
    const filtered = goals.filter((g) => g.id !== id);
    this.saveSavingsGoals(filtered);
  }

  // Chat messages
  getChatMessages(userId?: string): (ChatMessage & { userId?: string })[] {
    const key = this.getUserScopedKey(this.CHAT_MESSAGES_KEY);
    const messagesStr = localStorage.getItem(key);
    if (messagesStr) {
      try {
        const allMessages: (ChatMessage & { userId?: string })[] = JSON.parse(messagesStr);
        return userId ? allMessages.filter((m) => m.userId === userId) : allMessages;
      } catch {
        return [];
      }
    }
    return [];
  }

  saveChatMessage(message: ChatMessage & { userId?: string }): void {
    const messages = this.getChatMessages();
    messages.push(message);
    const key = this.getUserScopedKey(this.CHAT_MESSAGES_KEY);
    localStorage.setItem(key, JSON.stringify(messages));
    this.notifyChange();
  }

  getChatHistory(userId?: string): ChatMessage[] {
    const messages = this.getChatMessages(userId);
    // Remove userId from the returned messages for type compatibility
    return messages.map(({ userId, ...msg }) => msg);
  }

  clearChatHistory(userId?: string): void {
    if (userId) {
      const messages = this.getChatMessages();
      const filtered = messages.filter((m: any) => m.userId !== userId);
      const key = this.getUserScopedKey(this.CHAT_MESSAGES_KEY);
      localStorage.setItem(key, JSON.stringify(filtered));
    } else {
      const key = this.getUserScopedKey(this.CHAT_MESSAGES_KEY);
      localStorage.removeItem(key);
    }
    this.notifyChange();
  }

  // Clear all data
  clearAll(): void {
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    // Removing user-scoped keys for current user only
    const userId = this.getActiveUserId();
    if (userId) {
      localStorage.removeItem(`${this.FINANCIAL_DATA_KEY}_${userId}`);
      localStorage.removeItem(`${this.SAVINGS_GOALS_KEY}_${userId}`);
      localStorage.removeItem(`${this.CHAT_MESSAGES_KEY}_${userId}`);
    }
    this.notifyChange();
  }
}

export const storageService = new StorageService();

