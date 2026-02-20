import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, LogIn, Briefcase } from "lucide-react";
import officeTeam from "@/assets/office-team.png";

export default function Index() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      await signIn(email, password);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setSigningIn(false);
    }
  };

  const defaultCredentials = [
    { label: "Admin", email: "admin@jobcrm.com", password: "123456" },
    { label: "Manager", email: "manager@jobcrm.com", password: "123456" },
    { label: "Member", email: "member@jobcrm.com", password: "123456" },
  ];

  return (
    <div className="flex min-h-screen bg-muted">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-3/5 items-center justify-center p-12 bg-muted">
        <img
          src={officeTeam}
          alt="Team collaboration"
          className="max-w-full max-h-[80vh] object-contain"
        />
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-2/5 items-center justify-center p-8">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border p-8 space-y-6">
          {/* Logo / Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              FAM <span className="text-primary">Infomedia</span>
            </h1>
            <p className="text-muted-foreground text-sm">Sign in to start your session</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10 h-12"
                required
              />
              <Mail className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
            <div className="relative">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 h-12"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={signingIn} className="h-11 px-6 font-semibold">
                <LogIn className="mr-2 h-4 w-4" />
                {signingIn ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>

          {/* Default credentials */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Default Credentials</p>
            <div className="grid gap-2">
              {defaultCredentials.map((cred) => (
                <button
                  key={cred.label}
                  type="button"
                  onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                >
                  <span className="font-medium text-foreground">{cred.label}</span>
                  <span className="text-muted-foreground text-xs">{cred.email} / {cred.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
