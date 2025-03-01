import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Budget from "@/pages/budget";
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
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/budget" component={Budget} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto py-6">
          <Router />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
