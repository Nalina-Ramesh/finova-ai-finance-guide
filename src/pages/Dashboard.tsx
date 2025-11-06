import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, LogOut, User, Settings, Home } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import { storageService } from "@/services/storage";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = () => {
      if (!storageService.hasSession()) {
        navigate("/auth");
        return;
      }
      const currentUser = storageService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleSignOut = () => {
    storageService.setActiveUser(null);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              FINOVA
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/budget">
                <Button variant="ghost" size="sm">Budget</Button>
              </Link>
              <Link to="/transactions">
                <Button variant="ghost" size="sm">Transactions</Button>
              </Link>
              <Link to="/goals">
                <Button variant="ghost" size="sm">Goals</Button>
              </Link>
              <Link to="/insights">
                <Button variant="ghost" size="sm">Insights</Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.fullName}
              </span>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick links to moved sections */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-8">
          <Link to="/budget"><Button variant="outline" className="w-full">Budget</Button></Link>
          <Link to="/transactions"><Button variant="outline" className="w-full">Transactions</Button></Link>
          <Link to="/goals"><Button variant="outline" className="w-full">Goals</Button></Link>
          <Link to="/insights"><Button variant="outline" className="w-full">Insights</Button></Link>
        </div>

        {/* Chat Interface only */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Financial Assistant</CardTitle>
            </div>
            <CardDescription>
              Ask me anything about personal finance, budgeting, savings, investments, or money management.
              I'll provide personalized advice based on your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChatInterface userId={user?.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
