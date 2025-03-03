import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Budget from "@/pages/budget";
import Categories from "@/pages/categories";
import AuthPage from "@/pages/auth";
import Projects from "@/pages/projects";
import ProjectPage from "@/pages/project";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut, FolderKanban } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/language-switcher";

function Navigation() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;
  
  // Check if current path is project-specific
  const isProjectPage = location.startsWith('/project/');
  const isProjectsPage = location === '/projects' || location === '/';
  const showMainNav = !isProjectPage;

  return (
    <div className="w-full py-4 border-b">
      <div className="container mx-auto flex justify-between items-center">
        {showMainNav ? (
          <>
            <Tabs 
              value={location === '/' ? '/projects' : location} 
              onValueChange={navigate}
            >
              <TabsList>
                <TabsTrigger value="/home">{t('common.tasks')}</TabsTrigger>
                <TabsTrigger value="/budget">{t('common.budget')}</TabsTrigger>
                <TabsTrigger value="/categories">{t('common.categories')}</TabsTrigger>
                <TabsTrigger value="/projects">
                  <FolderKanban className="h-4 w-4 mr-2" />
                  {t('projects.myProjects')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        ) : (
          <div>
            {/* Placeholder for project-specific navigation handled in project page */}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              logout();
              navigate("/auth");
            }}
            title={t('common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Projects} />
      <ProtectedRoute path="/home" component={Home} />
      <ProtectedRoute path="/budget" component={Budget} />
      <ProtectedRoute path="/categories" component={Categories} />
      <ProtectedRoute path="/projects" component={Projects} />
      <ProtectedRoute path="/project/:id" component={ProjectPage} />
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