import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageService, SavingsGoal } from "@/services/storage";

const SavingsGoals = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    deadline: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    try {
      const savedGoals = storageService.getSavingsGoals();
      setGoals(savedGoals);
    } catch (error: any) {
      toast({
        title: "Error loading savings goals",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const targetAmount = parseFloat(formData.target_amount);
    const currentAmount = parseFloat(formData.current_amount || "0");

    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid target amount",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGoal) {
        storageService.updateSavingsGoal(editingGoal.id, {
          name: formData.name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          deadline: formData.deadline || null,
        });
        toast({
          title: "Success",
          description: "Savings goal updated",
        });
      } else {
        storageService.addSavingsGoal({
          name: formData.name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          deadline: formData.deadline || null,
        });
        toast({
          title: "Success",
          description: "Savings goal added",
        });
      }

      setIsDialogOpen(false);
      setEditingGoal(null);
      setFormData({
        name: "",
        target_amount: "",
        current_amount: "",
        deadline: "",
      });
      loadGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save goal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this savings goal?")) return;

    try {
      storageService.deleteSavingsGoal(id);
      toast({
        title: "Success",
        description: "Savings goal deleted",
      });
      loadGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
    setFormData({
      name: "",
      target_amount: "",
      current_amount: "",
      deadline: "",
    });
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <CardTitle>Savings Goals</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleClose()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Edit" : "Add"} Savings Goal</DialogTitle>
                <DialogDescription>
                  {editingGoal ? "Update" : "Create"} a new savings goal to track your progress
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_amount">Target Amount</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    placeholder="10000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_amount">Current Amount</Label>
                  <Input
                    id="current_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingGoal ? "Update" : "Add"} Goal</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Track your progress towards financial goals</CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No savings goals yet. Start by adding your first goal!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <div key={goal.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{goal.name}</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ${goal.current_amount.toLocaleString()} of ${goal.target_amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium text-lg">{progress.toFixed(0)}%</p>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsGoals;
