import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, User } from "lucide-react";

const roles = [
  { role: "admin", title: "Admin", description: "Full system access", icon: Shield, path: "/login/admin" },
  { role: "manager", title: "Manager", description: "Team management access", icon: Users, path: "/login/manager" },
  { role: "member", title: "Member", description: "Individual access", icon: User, path: "/login/member" },
];

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Job Consultancy CRM</h1>
          <p className="mt-2 text-muted-foreground">Select your role to sign in</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.role} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <r.icon className="mx-auto h-10 w-10 text-primary" />
                <CardTitle className="mt-2">{r.title}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={r.path}>
                  <Button className="w-full">Sign In as {r.title}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
