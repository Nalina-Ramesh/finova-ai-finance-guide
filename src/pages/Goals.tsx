import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User, Settings } from "lucide-react";
import SavingsGoals from "@/components/SavingsGoals";

const Goals = () => {
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
              <Link to="/budget"><Button variant="ghost" size="sm">Budget</Button></Link>
              <Link to="/transactions"><Button variant="ghost" size="sm">Transactions</Button></Link>
              <Link to="/goals"><Button variant="ghost" size="sm">Goals</Button></Link>
              <Link to="/insights"><Button variant="ghost" size="sm">Insights</Button></Link>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Savings Goals</h2>
          <p className="text-muted-foreground">Track and manage your goals</p>
        </div>

        <div className="mb-8">
          <SavingsGoals />
        </div>
      </main>
    </div>
  );
};

export default Goals;


