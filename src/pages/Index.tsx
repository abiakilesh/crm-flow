import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, User, Briefcase } from "lucide-react";

const roles = [
  { role: "admin", title: "Admin", description: "Full system access & management", icon: Shield, path: "/login/admin" },
  { role: "manager", title: "Manager", description: "Team management & oversight", icon: Users, path: "/login/manager" },
  { role: "member", title: "Member", description: "Individual task access", icon: User, path: "/login/member" },
];

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Job Consultancy CRM</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">Manage leads, sales, and finances with role-based access control</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.role} className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 border-2 border-transparent">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <r.icon className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="mt-3 text-lg">{r.title}</CardTitle>
                <CardDescription className="text-sm">{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={r.path}>
                  <Button className="w-full font-semibold" size="lg">Sign In</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
