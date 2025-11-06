import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Target } from "lucide-react";
import { storageService } from "@/services/storage";
import { aiService } from "@/services/aiService";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const BudgetSummary = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetSummary();
    const unsubscribe = storageService.subscribe(() => {
      loadBudgetSummary();
    });
    return () => unsubscribe();
  }, []);

  const loadBudgetSummary = async () => {
    try {
      const financialData = storageService.getFinancialData();
      const budgetSummary = await aiService.generateResponse("budget summary", []);
      
      if (budgetSummary.budgetSummary) {
        setSummary(budgetSummary.budgetSummary);
      } else {
        // Generate summary from financial data
        const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;
        const monthlySavings = financialData.monthlyIncome - financialData.monthlyExpenses;
        
        const categoryBreakdown = financialData.expenseBreakdown.reduce((acc, expense) => {
          if (!acc[expense.category]) {
            acc[expense.category] = 0;
          }
          acc[expense.category] += expense.amount;
          return acc;
        }, {} as Record<string, number>);

        setSummary({
          monthlyIncome: financialData.monthlyIncome,
          monthlyExpenses: financialData.monthlyExpenses,
          monthlySavings,
          savingsRate: savingsRate.toFixed(1),
          categoryBreakdown,
          totalBalance: financialData.totalBalance,
        });
      }
    } catch (error) {
      console.error("Error loading budget summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Summary</CardTitle>
          <CardDescription>Loading your budget analysis...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const pieData = Object.entries(summary.categoryBreakdown || {}).map(([name, value]: [string, any]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));

  const barData = [
    { name: 'Income', value: summary.monthlyIncome, type: 'income' },
    { name: 'Expenses', value: summary.monthlyExpenses, type: 'expense' },
    { name: 'Savings', value: summary.monthlySavings, type: 'saving' },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Budget Summary</CardTitle>
        </div>
        <CardDescription>Your monthly financial overview and breakdown</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Monthly Income</span>
            </div>
            <p className="text-2xl font-bold">${summary.monthlyIncome.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Monthly Expenses</span>
            </div>
            <p className="text-2xl font-bold">${summary.monthlyExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Monthly Savings</span>
            </div>
            <p className="text-2xl font-bold text-primary">${summary.monthlySavings.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Savings Rate</span>
            </div>
            <p className="text-2xl font-bold text-accent">{summary.savingsRate}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses vs Savings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Income, Expenses & Savings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Categories */}
          {pieData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown Table */}
        {pieData.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
            <div className="space-y-2">
              {pieData.map((item, index) => {
                const percentage = ((item.value / summary.monthlyExpenses) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                      <span className="font-semibold">${item.value.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetSummary;

