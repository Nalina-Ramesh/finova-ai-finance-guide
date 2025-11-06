import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Bot } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FINOVA
          </h1>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <section className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Your AI-Powered Financial Assistant
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Take control of your finances with intelligent insights, personalized advice, and smart money management tools.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-xl p-6 shadow-lg border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Expenses</h3>
            <p className="text-muted-foreground">
              Monitor your income and expenses with intuitive dashboards and real-time insights.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg border">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Savings Goals</h3>
            <p className="text-muted-foreground">
              Set and achieve your financial goals with progress tracking and smart recommendations.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg border">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Advisor</h3>
            <p className="text-muted-foreground">
              Get personalized financial advice and answers to your money questions instantly.
            </p>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>© 2025 FINOVA. Your trusted financial companion.</p>
      </footer>
    </div>
  );
};

export default Index;
