import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService } from "@/services/storage";

const FinancialOverview = () => {
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
    incomeChange: 0,
    expenseChange: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFinancialData();
    // Subscribe to storage changes for live updates
    const unsubscribe = storageService.subscribe(() => {
      loadFinancialData();
    });
    return () => unsubscribe();
  }, []);

  const loadFinancialData = () => {
    try {
      const financialData = storageService.getFinancialData();
      setStats({
        balance: financialData.totalBalance,
        income: financialData.monthlyIncome,
        expenses: financialData.monthlyExpenses,
        incomeChange: 0,
        expenseChange: 0,
      });
    } catch (error: any) {
      toast({
        title: "Error loading financial data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Current month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.income.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className={`text-xs ${stats.incomeChange >= 0 ? "text-accent" : "text-destructive"}`}>
            {stats.incomeChange >= 0 ? "+" : ""}
            {stats.incomeChange.toFixed(1)}% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.expenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className={`text-xs ${stats.expenseChange <= 0 ? "text-accent" : "text-destructive"}`}>
            {stats.expenseChange >= 0 ? "+" : ""}
            {stats.expenseChange.toFixed(1)}% from last month
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default FinancialOverview;
