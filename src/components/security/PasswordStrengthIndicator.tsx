import { useMemo, useEffect, useState } from 'react';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  onStrengthChange?: (isStrong: boolean, isLeaked: boolean) => void;
}

interface StrengthRule {
  label: string;
  test: (password: string) => boolean;
}

const rules: StrengthRule[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Número', test: (p) => /[0-9]/.test(p) },
  { label: 'Caractere especial (!@#$%...)', test: (p) => /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/.test(p) },
];

const getStrengthLevel = (score: number): { label: string; color: string; bgColor: string } => {
  if (score === 0) return { label: '', color: '', bgColor: 'bg-muted' };
  if (score <= 2) return { label: 'Fraca', color: 'text-destructive', bgColor: 'bg-destructive' };
  if (score <= 3) return { label: 'Média', color: 'text-warning', bgColor: 'bg-warning' };
  if (score <= 4) return { label: 'Boa', color: 'text-primary', bgColor: 'bg-primary' };
  return { label: 'Forte', color: 'text-success', bgColor: 'bg-success' };
};

// Check if password has been leaked using Have I Been Pwned API (k-anonymity)
async function checkLeakedPassword(password: string): Promise<boolean> {
  try {
    // Convert password to SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Send only first 5 characters (k-anonymity)
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });
    
    if (!response.ok) return false;
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our suffix appears in the response
    for (const line of hashes) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return true; // Password was found in breaches
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking leaked password:', error);
    return false; // Fail open - don't block user if API fails
  }
}

export const PasswordStrengthIndicator = ({ password, onStrengthChange }: PasswordStrengthIndicatorProps) => {
  const [isCheckingLeak, setIsCheckingLeak] = useState(false);
  const [isLeaked, setIsLeaked] = useState(false);
  const [lastCheckedPassword, setLastCheckedPassword] = useState('');

  const { score, passedRules } = useMemo(() => {
    const passed = rules.map(rule => rule.test(password));
    return {
      score: passed.filter(Boolean).length,
      passedRules: passed,
    };
  }, [password]);

  const strength = getStrengthLevel(score);
  const isStrong = score >= 4;

  // Debounced leak check
  useEffect(() => {
    if (!password || password.length < 8) {
      setIsLeaked(false);
      return;
    }

    // Don't recheck the same password
    if (password === lastCheckedPassword) return;

    const timeoutId = setTimeout(async () => {
      setIsCheckingLeak(true);
      const leaked = await checkLeakedPassword(password);
      setIsLeaked(leaked);
      setLastCheckedPassword(password);
      setIsCheckingLeak(false);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [password, lastCheckedPassword]);

  // Notify parent of strength changes
  useEffect(() => {
    onStrengthChange?.(isStrong, isLeaked);
  }, [isStrong, isLeaked, onStrengthChange]);

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

      {/* Leaked password warning */}
      {isCheckingLeak && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Verificando se a senha foi vazada...</span>
        </div>
      )}

      {isLeaked && !isCheckingLeak && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Esta senha foi encontrada em vazamentos de dados. Escolha outra senha.</span>
        </div>
      )}

      {!isLeaked && !isCheckingLeak && password.length >= 8 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20 text-xs text-success">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>Senha não encontrada em vazamentos conhecidos</span>
        </div>
      )}

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
