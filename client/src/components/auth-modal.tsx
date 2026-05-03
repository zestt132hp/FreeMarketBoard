import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, insertUserSchema } from "../../../shared/schema";
import type { LoginData, InsertUser } from "../../../shared/schema";
import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
}

export function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const { login, register, isLoading } = useAuth();
  const { toast } = useToast();
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

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
        title: "С возвращением!",
        description: "Вы успешно вошли в своё учётную запись!",
      });
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: "Неверный номер телефона или пароль.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: InsertUser) => {
    try {
      await register(data);
      onClose();
      toast({
        title: "Добро пожаловать!",
        description: "Ваш аккаунт был успешно создан.",
      });
    } catch (error) {
      toast({
        title: "Ошибка регистрации!",
        description: "Произошла ошибка при создании вашей учетной записи.",
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
    setIsRecoveryMode(false);
  };

  const handleRecovery = async () => {
    if (!recoveryEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите номер телефона",
        variant: "destructive",
      });
      return;
    }

    setIsRecoveryLoading(true);
    try {
      // Call the password reset API
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: recoveryEmail,
          newPassword: "temp123" // Temporary password
        }),
      });

      if (response.ok) {
        toast({
          title: "Успешно!",
          description: "Пароль сброшен. Новый пароль: temp123",
        });
        setIsRecoveryMode(false);
        setRecoveryEmail("");
      } else {
        throw new Error("Failed to reset password");
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить пароль. Обратитесь к администратору.",
        variant: "destructive",
      });
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isRecoveryMode ? "Сброс пароля" : mode === "login" ? "Вход" : "Регистрация"}
          </DialogTitle>
        </DialogHeader>

        {isRecoveryMode ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recovery-phone">Номер телефона</Label>
              <Input
                id="recovery-phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleRecovery}
              disabled={isRecoveryLoading}
            >
              {isRecoveryLoading ? "Отправка..." : "Сбросить пароль"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-muted-foreground text-xs cursor-pointer"
                onClick={() => setIsRecoveryMode(false)}
              >
                ← Вернуться к входу
              </Button>
            </div>
          </div>
        ) : mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <Label htmlFor="phone">Номер телефона</Label>
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
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите ваш пароль"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Вход..." : "Вход"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Ещё нет учётной записи? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={switchToRegister}
              >
                Регистрация
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-muted-foreground text-xs cursor-pointer"
                onClick={() => setIsRecoveryMode(true)}
              >
                Забыли пароль?
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div>
              <Label htmlFor="name">Полное имя</Label>
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
              <Label htmlFor="phone">Номер телефона</Label>
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
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Укажите пароль"
                {...registerForm.register("password")}
              />
              {registerForm.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Регистрация..." : "Регистрация"}
            </Button>

            <div className="text-center">
              <span className="text-sm text-gray-600">Уже зарегистрированы? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={switchToLogin}
              >
                Вход
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
