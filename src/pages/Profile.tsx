import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Save, ArrowLeft, Target } from "lucide-react";
import { storageService, User as UserType } from "@/services/storage";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    demographic: {
      type: "professional" as "student" | "professional" | "retiree" | "entrepreneur",
      age: "",
      location: "",
      occupation: "",
    },
    financialGoals: [] as string[],
  });
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    if (!storageService.hasSession()) {
      navigate("/auth");
      return;
    }

    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData({
        fullName: currentUser.fullName,
        email: currentUser.email,
        demographic: currentUser.demographic || {
          type: "professional",
          age: "",
          location: "",
          occupation: "",
        },
        financialGoals: currentUser.financialGoals || [],
      });
    }
  }, [navigate]);

  const handleSave = () => {
    setLoading(true);
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }

      const updatedUser: UserType = {
        ...user,
        fullName: formData.fullName,
        email: formData.email,
        demographic: formData.demographic,
        financialGoals: formData.financialGoals,
      };

      storageService.updateUser(updatedUser);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setFormData({
        ...formData,
        financialGoals: [...formData.financialGoals, newGoal.trim()],
      });
      setNewGoal("");
    }
  };

  const handleRemoveGoal = (index: number) => {
    setFormData({
      ...formData,
      financialGoals: formData.financialGoals.filter((_, i) => i !== index),
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Profile
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <CardDescription>Update your personal details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Demographic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Demographic Information</h3>
              <p className="text-sm text-muted-foreground">
                This helps us provide personalized financial advice tailored to your situation.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="demographicType">User Type</Label>
                <Select
                  value={formData.demographic.type}
                  onValueChange={(value: any) =>
                    setFormData({
                      ...formData,
                      demographic: { ...formData.demographic, type: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="retiree">Retiree</SelectItem>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age (optional)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.demographic.age}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        demographic: { ...formData.demographic, age: e.target.value },
                      })
                    }
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    value={formData.demographic.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        demographic: { ...formData.demographic, location: e.target.value },
                      })
                    }
                    placeholder="New York, NY"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation (optional)</Label>
                <Input
                  id="occupation"
                  value={formData.demographic.occupation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      demographic: { ...formData.demographic, occupation: e.target.value },
                    })
                  }
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            {/* Financial Goals */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-semibold">Financial Goals</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Set your financial goals to receive personalized advice and tracking.
              </p>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddGoal();
                      }
                    }}
                    placeholder="e.g., Save $10,000 for emergency fund"
                  />
                  <Button type="button" onClick={handleAddGoal}>
                    Add
                  </Button>
                </div>
              </div>

              {formData.financialGoals.length > 0 && (
                <div className="space-y-2">
                  {formData.financialGoals.map((goal, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm">{goal}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGoal(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;

