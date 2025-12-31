import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthRule {
  label: string;
  test: (password: string) => boolean;
}

const rules: StrengthRule[] = [
  { label: 'Mínimo 6 caracteres', test: (p) => p.length >= 6 },
  { label: 'Letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Número', test: (p) => /[0-9]/.test(p) },
  { label: 'Caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const getStrengthLevel = (score: number): { label: string; color: string; bgColor: string } => {
  if (score === 0) return { label: '', color: '', bgColor: 'bg-muted' };
  if (score <= 2) return { label: 'Fraca', color: 'text-destructive', bgColor: 'bg-destructive' };
  if (score <= 3) return { label: 'Média', color: 'text-warning', bgColor: 'bg-warning' };
  if (score <= 4) return { label: 'Boa', color: 'text-primary', bgColor: 'bg-primary' };
  return { label: 'Forte', color: 'text-success', bgColor: 'bg-success' };
};

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const { score, passedRules } = useMemo(() => {
    const passed = rules.map(rule => rule.test(password));
    return {
      score: passed.filter(Boolean).length,
      passedRules: passed,
    };
  }, [password]);

  const strength = getStrengthLevel(score);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Progress bars */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              score >= level ? strength.bgColor : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Strength label */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Força da senha:</span>
        <span className={cn("text-xs font-medium", strength.color)}>
          {strength.label}
        </span>
      </div>

      {/* Rules checklist */}
      <div className="grid grid-cols-2 gap-1">
        {rules.map((rule, index) => (
          <div
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              passedRules[index] ? "text-success" : "text-muted-foreground"
            )}
          >
            {passedRules[index] ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
