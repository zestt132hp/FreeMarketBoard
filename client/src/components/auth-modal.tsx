import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, insertUserSchema } from "@shared/schema";
import type { LoginData, InsertUser } from "@shared/schema";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
}

export function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginData) => {
    try {
      await login(data);
      onClose();
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid phone number or password.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: InsertUser) => {
    try {
      await register(data);
      onClose();
      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An error occurred while creating your account.",
        variant: "destructive",
      });
    }
  };

  const switchToRegister = () => {
    onSwitchMode("register");
    loginForm.reset();
  };

  const switchToLogin = () => {
    onSwitchMode("login");
    registerForm.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === "login" ? "Login" : "Register"}
          </DialogTitle>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...loginForm.register("phone")}
              />
              {loginForm.formState.errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {loginForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Don't have an account? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={switchToRegister}
              >
                Register
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...registerForm.register("name")}
              />
              {registerForm.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {registerForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...registerForm.register("phone")}
              />
              {registerForm.formState.errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {registerForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Register"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Already have an account? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={switchToLogin}
              >
                Login
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
