import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input, Label, Checkbox } from "@/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/data-display";
import { Alert, AlertDescription } from "@/components/feedback";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();
  const brandOrange = "#f15a24";
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already logged in
  // Only redirect after we've confirmed the auth state is stable
  useEffect(() => {
    // Small delay to ensure auth context has initialized
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only redirect if auth is checked AND user is authenticated
    if (authChecked && isAuthenticated && user) {
      switch (user.role) {
        case "admin":
          navigate("/admin-panel", { replace: true });
          break;
        case "staff":
          navigate("/staff-dashboard", { replace: true });
          break;
        case "guard":
          navigate("/guard-portal", { replace: true });
          break;
        default:
          navigate("/", { replace: true });
      }
    }
  }, [authChecked, isAuthenticated, user, navigate]);

  useEffect(() => {
    // Load remembered username if exists
    const rememberedUser = localStorage.getItem("rememberedUser");
    if (rememberedUser) {
      setFormData((prev) => ({
        ...prev,
        username: rememberedUser,
        rememberMe: true,
      }));
    }
  }, []);

  // Validate form fields
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "username":
        return value.trim() === "" ? "Username or Email is required" : "";
      case "password":
        return value.trim() === ""
          ? "Password is required"
          : value.length < 6
            ? "Password must be at least 6 characters"
            : "";
      default:
        return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear validation error when user types
    if (type !== "checkbox") {
      const error = validateField(name, value);
      setValidationErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }

    // Clear error when user starts typing
    if (error) setError("");
  };

  const validateForm = (): boolean => {
    const usernameError = validateField("username", formData.username);
    const passwordError = validateField("password", formData.password);

    setValidationErrors({
      username: usernameError,
      password: passwordError,
    });

    return !usernameError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(formData.username, formData.password);

      if (success) {
        // Handle remember me functionality
        if (formData.rememberMe) {
          localStorage.setItem("rememberedUser", formData.username);
        } else {
          localStorage.removeItem("rememberedUser");
        }

        // Show success animation briefly before redirecting
        setLoginSuccess(true);

        toast({
          title: "Login Successful",
          description: `Welcome back, ${formData.username}!`,
        });

        // Get the user from the context after successful login
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        // Delay navigation slightly to show success animation
        setTimeout(() => {
          switch (user.role) {
            case "admin":
              navigate("/admin-panel");
              break;
            case "staff":
              navigate("/staff-dashboard");
              break;
            case "guard":
              navigate("/guard-portal");
              break;
            default:
              navigate("/");
          }
        }, 800);
      } else {
        setError("Invalid username or password");
        toast({
          title: "Login Failed",
          description: "Invalid username or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setError("An error occurred during login. Please try again.");
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    }

    if (!loginSuccess) {
      setIsLoading(false);
    }
  };

  // Demo access removed – using explicit credentials section below

  return (
    <div
      id="main-content"
      className="relative min-h-screen bg-gradient-to-br from-[#0a4d9b] via-[#0d5fbf] to-[#0a4d9b] text-slate-900 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_0,rgba(255,255,255,0.12),transparent_30%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 lg:px-10">
        <Link
          to="/"
          className="absolute left-6 top-6 flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
          style={{ color: brandOrange }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:flex flex-col gap-6 text-white">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-1.5 rounded-full"
                style={{ backgroundColor: brandOrange }}
              />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                  Aditya University
                </p>
                <h1 className="text-3xl font-semibold leading-tight">
                  Secure Access for Students, Staff, and Guests
                </h1>
              </div>
            </div>
            <img
              src="/auslogo.png"
              alt="Aditya University"
              className="h-14 w-auto drop-shadow-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              {[
                "Fast check-ins",
                "Appointment tracking",
                "Role-based access",
                "Secure campus",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur"
                >
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-sm text-white/80">
                Use your institutional credentials to manage visits, approvals,
                and notifications across campus departments.
              </p>
            </div>
          </div>

          <Card className="w-full border border-white/20 bg-white/90 shadow-xl backdrop-blur-lg">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-center gap-2">
                <div
                  className="h-12 w-12 rounded-xl bg-white shadow"
                  style={{ border: `2px solid ${brandOrange}` }}
                >
                  <img
                    src="/auslogo.png"
                    alt="Aditya University Logo"
                    className="h-full w-full rounded-xl object-contain p-2"
                  />
                </div>
              </div>
              <CardTitle className="text-center text-2xl font-semibold text-slate-900">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center text-slate-600">
                Sign in to continue to the Visitor & Appointment System
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="text-sm py-2 flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loginSuccess && (
                <Alert className="bg-green-50 text-green-800 border-green-200 text-sm py-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Login successful! Redirecting...
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Username or Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="username"
                      name="username"
                      placeholder="Enter your username or email"
                      className={`pl-9 bg-white ${validationErrors.username ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-[#0a4d9b]"}`}
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={isLoading || loginSuccess}
                    />
                    {validationErrors.username && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className={`pl-9 bg-white ${validationErrors.password ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-[#0a4d9b]"}`}
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isLoading || loginSuccess}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || loginSuccess}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    {validationErrors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({
                        ...prev,
                        rememberMe: checked === true,
                      }));
                    }}
                    disabled={isLoading || loginSuccess}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none text-slate-700"
                  >
                    Remember me
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full border-2 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: brandOrange,
                    borderColor: brandOrange,
                    boxShadow: `0 15px 30px rgba(241,90,36,0.35)`,
                  }}
                  disabled={isLoading || loginSuccess}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-pulse">Signing in</span>
                      <span className="animate-pulse delay-100">.</span>
                      <span className="animate-pulse delay-200">.</span>
                      <span className="animate-pulse delay-300">.</span>
                    </>
                  ) : loginSuccess ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Success
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-0">
              <div className="text-xs text-center text-slate-500 w-full">
                <p>
                  By signing in, you agree to our Terms of Service and Privacy
                  Policy
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="relative pb-6 text-center text-xs text-white/80">
        <p>
          © {new Date().getFullYear()} Aditya University. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
