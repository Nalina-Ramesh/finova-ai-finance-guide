import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ArrowUp, ArrowDown } from "lucide-react";
import { storageService } from "@/services/storage";
import { aiService } from "@/services/aiService";

const SpendingInsights = () => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
    const unsubscribe = storageService.subscribe(() => {
      loadInsights();
    });
    return () => unsubscribe();
  }, []);

  const loadInsights = async () => {
    try {
      const financialData = storageService.getFinancialData();
      const response = await aiService.generateResponse("spending insights", []);
      
      if (response.insights) {
        setInsights(response.insights);
      } else {
        // Generate insights from financial data
        const insightsData = {
          trends: [] as string[],
          anomalies: [] as string[],
          recommendations: [] as string[],
        };

        const savingsRate = ((financialData.monthlyIncome - financialData.monthlyExpenses) / financialData.monthlyIncome) * 100;

        if (financialData.expenseHistory.length > 1) {
          const recentExpenses = financialData.expenseHistory.slice(-3).reduce((sum, e) => sum + e.amount, 0) / 3;
          const olderExpenses = financialData.expenseHistory.slice(-6, -3).reduce((sum, e) => sum + e.amount, 0) / 3;
          
          if (recentExpenses > olderExpenses * 1.1) {
            insightsData.trends.push('Your spending has increased by over 10% in recent months.');
            insightsData.recommendations.push('Review your recent expenses to identify areas where you can cut back.');
          } else if (recentExpenses < olderExpenses * 0.9) {
            insightsData.trends.push('Great job! Your spending has decreased recently.');
          }
        }

        if (savingsRate < 10) {
          insightsData.recommendations.push('Consider increasing your savings rate to at least 10% of your income.');
        } else if (savingsRate >= 20) {
          insightsData.trends.push('Excellent savings rate! You\'re saving 20% or more of your income.');
        }

        const categoryBreakdown = financialData.expenseBreakdown.reduce((acc, expense) => {
          if (!acc[expense.category]) {
            acc[expense.category] = 0;
          }
          acc[expense.category] += expense.amount;
          return acc;
        }, {} as Record<string, number>);

        const maxCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];
        if (maxCategory && maxCategory[1] > financialData.monthlyExpenses * 0.4) {
          insightsData.recommendations.push(`${maxCategory[0]} is your largest expense category. Consider reviewing it for optimization opportunities.`);
        }

        if (financialData.totalBalance < financialData.monthlyExpenses * 3) {
          insightsData.anomalies.push('Your emergency fund is below 3 months of expenses. Consider building it up.');
          insightsData.recommendations.push('Aim to have 3-6 months of expenses saved as an emergency fund.');
        }

        setInsights(insightsData);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Insights</CardTitle>
          <CardDescription>Analyzing your spending patterns...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-accent" />
          <CardTitle>Spending Insights & Recommendations</CardTitle>
        </div>
        <CardDescription>AI-powered analysis of your spending habits and financial patterns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trends */}
        {insights.trends && insights.trends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Trends</h3>
            </div>
            <div className="space-y-3">
              {insights.trends.map((trend: string, index: number) => (
                <Alert key={index} className="border-primary/50 bg-primary/5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <AlertDescription>{trend}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {insights.anomalies && insights.anomalies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-lg font-semibold">Items to Review</h3>
            </div>
            <div className="space-y-3">
              {insights.anomalies.map((anomaly: string, index: number) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Attention</AlertTitle>
                  <AlertDescription>{anomaly}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Actionable Recommendations</h3>
            </div>
            <div className="space-y-3">
              {insights.recommendations.map((rec: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/20 rounded-lg"
                >
                  <Badge variant="outline" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <p className="flex-1 text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!insights.trends || insights.trends.length === 0) &&
          (!insights.anomalies || insights.anomalies.length === 0) &&
          (!insights.recommendations || insights.recommendations.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No insights available yet.</p>
              <p className="text-sm mt-2">Add more financial data to get personalized insights!</p>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default SpendingInsights;

