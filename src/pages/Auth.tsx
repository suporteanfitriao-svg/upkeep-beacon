import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowLeft, Mail } from 'lucide-react';
import { AddToHomeScreen } from '@/components/pwa/AddToHomeScreen';

// Password strength validation
const passwordSchema = z.string()
  .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  .max(72, { message: 'Senha deve ter no máximo 72 caracteres' })
  .refine((val) => /[A-Z]/.test(val), { message: 'Senha deve conter pelo menos uma letra maiúscula' })
  .refine((val) => /[a-z]/.test(val), { message: 'Senha deve conter pelo menos uma letra minúscula' })
  .refine((val) => /[0-9]/.test(val), { message: 'Senha deve conter pelo menos um número' })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(val), { message: 'Senha deve conter pelo menos um caractere especial (!@#$%^&*...)' });

const authSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }).max(255),
  password: passwordSchema,
});

// Password strength indicator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: 'bg-destructive' };
  if (score <= 4) return { score, label: 'Média', color: 'bg-yellow-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
};

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get('reset') === 'true';
  
  const [view, setView] = useState<AuthView>(isResetMode ? 'reset-password' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const { signIn, signUp, user, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect if in reset password mode
    if (user && !isResetMode) {
      navigate('/');
    }
  }, [user, navigate, isResetMode]);

  // Update view when reset param changes
  useEffect(() => {
    if (isResetMode) {
      setView('reset-password');
    }
  }, [isResetMode]);

  const validateForm = (): boolean => {
    if (view === 'forgot-password') {
      try {
        z.string().email({ message: 'Email inválido' }).parse(email);
        setErrors({});
        return true;
      } catch (err) {
        if (err instanceof z.ZodError) {
          setErrors({ email: err.errors[0]?.message });
        }
        return false;
      }
    }

    if (view === 'reset-password') {
      try {
        passwordSchema.parse(password);
        if (password !== confirmPassword) {
          setErrors({ confirmPassword: 'As senhas não coincidem' });
          return false;
        }
        setErrors({});
        return true;
      } catch (err) {
        if (err instanceof z.ZodError) {
          setErrors({ password: err.errors[0]?.message });
        }
        return false;
      }
    }

    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        err.errors.forEach((error) => {
          if (error.path[0] === 'email') {
            fieldErrors.email = error.message;
          } else if (error.path[0] === 'password') {
            fieldErrors.password = error.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (view === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(error.message);
        } else {
          setResetEmailSent(true);
          toast.success('Email de recuperação enviado!');
        }
      } else if (view === 'reset-password') {
        const { error } = await updatePassword(password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Senha atualizada com sucesso!');
          // Clear the URL parameter and redirect
          navigate('/auth');
          setView('login');
        }
      } else if (view === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada com sucesso! Você já pode fazer login.');
          setView('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'forgot-password':
        return 'Recuperar Senha';
      case 'reset-password':
        return 'Nova Senha';
      case 'signup':
        return 'Criar Conta';
      default:
        return 'Entrar';
    }
  };

  const getDescription = () => {
    switch (view) {
      case 'forgot-password':
        return 'Digite seu email para receber o link de recuperação';
      case 'reset-password':
        return 'Digite sua nova senha';
      case 'signup':
        return 'Crie uma conta para começar';
      default:
        return 'Acesse sua conta para gerenciar as limpezas';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {(view === 'forgot-password' || view === 'reset-password') && (
            <button
              type="button"
              onClick={() => {
                setView('login');
                setResetEmailSent(false);
                setErrors({});
                navigate('/auth');
              }}
              className="absolute left-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {view === 'forgot-password' && resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-xl inline-flex mx-auto">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Email Enviado!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setView('login');
                  setResetEmailSent(false);
                }}
              >
                Voltar para Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {view !== 'reset-password' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              )}
              
              {view !== 'forgot-password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {view === 'reset-password' ? 'Nova Senha' : 'Senha'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={errors.password ? 'border-destructive' : ''}
                  />
                  {(view === 'signup' || view === 'reset-password') && password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i < getPasswordStrength(password).score
                                ? getPasswordStrength(password).color
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${
                        getPasswordStrength(password).score <= 2 ? 'text-destructive' :
                        getPasswordStrength(password).score <= 4 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        Força: {getPasswordStrength(password).label}
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li className={password.length >= 8 ? 'text-green-600' : ''}>
                          {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                        </li>
                        <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                          {/[A-Z]/.test(password) ? '✓' : '○'} Uma letra maiúscula
                        </li>
                        <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                          {/[a-z]/.test(password) ? '✓' : '○'} Uma letra minúscula
                        </li>
                        <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                          {/[0-9]/.test(password) ? '✓' : '○'} Um número
                        </li>
                        <li className={/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password) ? 'text-green-600' : ''}>
                          {/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password) ? '✓' : '○'} Um caractere especial
                        </li>
                      </ul>
                    </div>
                  )}
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              {view === 'reset-password' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {view === 'forgot-password' ? 'Enviar Email' : 
                 view === 'reset-password' ? 'Atualizar Senha' :
                 view === 'login' ? 'Entrar' : 'Criar Conta'}
              </Button>
            </form>
          )}

          {view === 'login' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setView('forgot-password');
                  setErrors({});
                }}
                className="text-sm text-primary hover:underline transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {(view === 'login' || view === 'signup') && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setView(view === 'login' ? 'signup' : 'login');
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {view === 'login' 
                  ? 'Não tem uma conta? Criar conta' 
                  : 'Já tem uma conta? Entrar'
                }
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Install prompt for mobile */}
      <AddToHomeScreen className="w-full max-w-md" />
    </div>
  );
};

export default Auth;
