import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Budget from "@/pages/budget";
import Categories from "@/pages/categories";
import AuthPage from "@/pages/auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";

function Navigation() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full py-4 border-b">
      <div className="container mx-auto flex justify-between items-center">
        <Tabs value={location} onValueChange={navigate}>
          <TabsList>
            <TabsTrigger value="/">Tasks</TabsTrigger>
            <TabsTrigger value="/budget">Budget</TabsTrigger>
            <TabsTrigger value="/categories">Categories</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            logout();
            navigate("/auth");
          }}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/budget" component={Budget} />
      <ProtectedRoute path="/categories" component={Categories} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container mx-auto py-6">
            <Router />
          </main>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;