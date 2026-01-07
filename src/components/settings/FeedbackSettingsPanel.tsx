import { Volume2, VolumeX, Vibrate, Bell, Check, X, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFeedbackPreferences, useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

export function FeedbackSettingsPanel() {
  const { 
    soundEnabled, 
    hapticEnabled, 
    volume,
    setSoundEnabled, 
    setHapticEnabled,
    setVolume 
  } = useFeedbackPreferences();
  
  const feedback = useFeedback();

  const testButtons = [
    { label: "Sucesso", icon: Check, action: feedback.success, color: "text-green-500" },
    { label: "Erro", icon: X, action: feedback.error, color: "text-red-500" },
    { label: "Aviso", icon: AlertTriangle, action: feedback.warning, color: "text-yellow-500" },
    { label: "Info", icon: Info, action: feedback.info, color: "text-blue-500" },
    { label: "Aprovação", icon: Check, action: feedback.approval, color: "text-emerald-500" },
    { label: "Rejeição", icon: X, action: feedback.rejection, color: "text-rose-500" },
    { label: "Notificação", icon: Bell, action: feedback.notification, color: "text-purple-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Feedback Sonoro e Háptico
        </CardTitle>
        <CardDescription>
          Configure o feedback sensorial para ações importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="sound-toggle" className="text-base font-medium">
                Feedback Sonoro
              </Label>
              <p className="text-sm text-muted-foreground">
                Sons para ações como aprovações e erros
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
          />
        </div>

        {/* Volume Slider */}
        {soundEnabled && (
          <div className="space-y-3 pl-8">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Volume</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        {/* Haptic Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className={cn(
              "h-5 w-5",
              hapticEnabled ? "text-primary" : "text-muted-foreground"
            )} />
            <div>
              <Label htmlFor="haptic-toggle" className="text-base font-medium">
                Feedback Háptico
              </Label>
              <p className="text-sm text-muted-foreground">
                Vibração para dispositivos móveis
              </p>
            </div>
          </div>
          <Switch
            id="haptic-toggle"
            checked={hapticEnabled}
            onCheckedChange={setHapticEnabled}
          />
        </div>

        {/* Test Buttons */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium mb-3 block">
            Testar Feedback
          </Label>
          <div className="flex flex-wrap gap-2">
            {testButtons.map(({ label, icon: Icon, action, color }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={action}
                className="gap-1.5"
              >
                <Icon className={cn("h-3.5 w-3.5", color)} />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
