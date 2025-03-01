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
import { AuthProvider } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

function Navigation() {
  const [location, navigate] = useLocation();

  return (
    <div className="w-full py-4 border-b">
      <div className="container mx-auto">
        <Tabs value={location} onValueChange={navigate}>
          <TabsList>
            <TabsTrigger value="/">Tasks</TabsTrigger>
            <TabsTrigger value="/budget">Budget</TabsTrigger>
            <TabsTrigger value="/categories">Categories</TabsTrigger>
          </TabsList>
        </Tabs>
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