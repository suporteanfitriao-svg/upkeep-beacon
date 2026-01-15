import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
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

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = (): boolean => {
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
      if (isLogin) {
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
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Acesse sua conta para gerenciar as limpezas' 
              : 'Crie uma conta para começar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {!isLogin && password && (
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin 
                ? 'Não tem uma conta? Criar conta' 
                : 'Já tem uma conta? Entrar'
              }
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Install prompt for mobile */}
      <AddToHomeScreen className="w-full max-w-md" />
    </div>
  );
};

export default Auth;
