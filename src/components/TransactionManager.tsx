import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { storageService } from "@/services/storage";

const TransactionManager = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const incomeCategories = ["Salary", "Freelance", "Investment", "Bonus", "Other"];
  const expenseCategories = ["Food & Dining", "Transportation", "Shopping", "Bills & Utilities", "Entertainment", "Healthcare", "Education", "Travel", "Other"];

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const financialData = storageService.getFinancialData();
    const allTransactions = [
      ...financialData.incomeHistory.map((inc: any) => ({ ...inc, type: "income" })),
      ...financialData.expenseHistory.map((exp: any) => ({ ...exp, type: "expense" })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(allTransactions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const financialData = storageService.getFinancialData();
      
      if (editingTransaction) {
        // Remove old transaction
        if (editingTransaction.type === "income") {
          financialData.incomeHistory = financialData.incomeHistory.filter(
            (inc: any) => !(inc.date === editingTransaction.date && inc.amount === editingTransaction.amount)
          );
        } else {
          financialData.expenseHistory = financialData.expenseHistory.filter(
            (exp: any) => !(exp.date === editingTransaction.date && exp.amount === editingTransaction.amount && exp.category === editingTransaction.category)
          );
          // Remove from expense breakdown
          const breakdownIndex = financialData.expenseBreakdown.findIndex(
            (exp: any) => exp.category === editingTransaction.category && exp.date === editingTransaction.date
          );
          if (breakdownIndex !== -1) {
            financialData.expenseBreakdown[breakdownIndex].amount -= editingTransaction.amount;
            if (financialData.expenseBreakdown[breakdownIndex].amount <= 0) {
              financialData.expenseBreakdown.splice(breakdownIndex, 1);
            }
          }
        }
      }

      // Add new transaction
      if (formData.type === "income") {
        financialData.incomeHistory.push({
          date: formData.date,
          amount: amount,
        });
      } else {
        financialData.expenseHistory.push({
          date: formData.date,
          amount: amount,
          category: formData.category,
        });
      }

      // Update expense breakdown
      if (formData.type === "expense") {
        const existingIndex = financialData.expenseBreakdown.findIndex(
          (exp: any) => exp.category === formData.category && exp.date === formData.date
        );
        if (existingIndex !== -1) {
          financialData.expenseBreakdown[existingIndex].amount += amount;
        } else {
          financialData.expenseBreakdown.push({
            category: formData.category,
            amount: amount,
            date: formData.date,
          });
        }
      }

      // Recalculate totals
      const totalIncome = financialData.incomeHistory.reduce((sum: number, inc: any) => sum + inc.amount, 0);
      const totalExpenses = financialData.expenseHistory.reduce((sum: number, exp: any) => sum + exp.amount, 0);
      
      financialData.monthlyIncome = totalIncome;
      financialData.monthlyExpenses = totalExpenses;
      
      // Update balance based on transaction type
      if (editingTransaction) {
        // Reverse old transaction effect
        const oldAmount = editingTransaction.amount;
        financialData.totalBalance += (editingTransaction.type === "income" ? -oldAmount : oldAmount);
      }
      // Apply new transaction
      financialData.totalBalance += (formData.type === "income" ? amount : -amount);

      storageService.saveFinancialData(financialData);
      
      toast({
        title: "Success",
        description: editingTransaction ? "Transaction updated" : "Transaction added",
      });

      setIsDialogOpen(false);
      setEditingTransaction(null);
      setFormData({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      loadTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category || "",
      description: transaction.description || "",
      date: transaction.date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: any) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const financialData = storageService.getFinancialData();
      
      if (transaction.type === "income") {
        financialData.incomeHistory = financialData.incomeHistory.filter(
          (inc: any) => !(inc.date === transaction.date && inc.amount === transaction.amount)
        );
        financialData.totalBalance -= transaction.amount;
      } else {
        financialData.expenseHistory = financialData.expenseHistory.filter(
          (exp: any) => !(exp.date === transaction.date && exp.amount === transaction.amount && exp.category === transaction.category)
        );
        financialData.expenseBreakdown = financialData.expenseBreakdown.filter(
          (exp: any) => !(exp.category === transaction.category && exp.date === transaction.date && exp.amount === transaction.amount)
        );
        financialData.totalBalance += transaction.amount;
      }

      const totalIncome = financialData.incomeHistory.reduce((sum: number, inc: any) => sum + inc.amount, 0);
      const totalExpenses = financialData.expenseHistory.reduce((sum: number, exp: any) => sum + exp.amount, 0);
      
      financialData.monthlyIncome = totalIncome;
      financialData.monthlyExpenses = totalExpenses;

      storageService.saveFinancialData(financialData);
      
      toast({
        title: "Success",
        description: "Transaction deleted",
      });

      loadTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
    setFormData({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Manage your income and expenses</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleClose()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
                <DialogDescription>
                  {editingTransaction ? "Update" : "Create"} a new income or expense entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "income" | "expense") =>
                      setFormData({ ...formData, type: value, category: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === "income"
                        ? incomeCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))
                        : expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add a note..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingTransaction ? "Update" : "Add"} Transaction</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No transactions yet. Add your first transaction to get started!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                        {transaction.type === "income" ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.category || "N/A"}</TableCell>
                    <TableCell>{transaction.description || "-"}</TableCell>
                    <TableCell className={`text-right font-medium ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {transaction.type === "income" ? "+" : "-"}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionManager;

