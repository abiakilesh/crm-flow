import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Shield, Users, User } from "lucide-react";

const roleIcons = { admin: Shield, manager: Users, member: User };
const roleColors = { admin: "text-destructive", manager: "text-primary", member: "text-accent-foreground" };

interface LoginFormProps {
  role: "admin" | "manager" | "member";
  title: string;
}

export function LoginForm({ role, title }: LoginFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const Icon = roleIcons[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length !== 6 || !/^\d{6}$/.test(password)) {
      toast.error("Password must be exactly 6 digits");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Icon className={`h-10 w-10 ${roleColors[role]}`} />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>Enter your credentials to access the {role} dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password (6 digits)</label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={password} onChange={setPassword} pattern="^[0-9]*$">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="flex justify-between text-sm">
              <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Forgot Password?</Link>
              <Link to="/" className="text-muted-foreground hover:text-primary">Switch Role</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
