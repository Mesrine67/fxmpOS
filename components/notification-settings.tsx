"use client"

import { useEffect, useState } from "react"
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification"
import { BellIcon, CheckIcon, InfoIcon, ShieldCheckIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  useNotificationPreferences,
  writeNotificationPreferences,
  type NotificationPosition,
} from "@/lib/notification-preferences"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type PermissionState = "loading" | "granted" | "prompt" | "denied" | "unavailable"
type NotificationTestKind = "success" | "info" | "warning" | "error"

const notificationTests: {
  kind: NotificationTestKind
  label: string
  title: string
  body: string
}[] = [
  {
    kind: "success",
    label: "Succès",
    title: "FXMP OS · Opération réussie",
    body: "Exemple de notification de confirmation.",
  },
  {
    kind: "info",
    label: "Information",
    title: "FXMP OS · Information",
    body: "Exemple de notification informative.",
  },
  {
    kind: "warning",
    label: "Attention",
    title: "FXMP OS · Attention",
    body: "Exemple de notification de vigilance.",
  },
  {
    kind: "error",
    label: "Erreur",
    title: "FXMP OS · Erreur",
    body: "Exemple de notification signalant une erreur.",
  },
]

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function NotificationSettings() {
  const desktopRuntime = useTauriRuntime()
  const preferences = useNotificationPreferences()
  const [permission, setPermission] = useState<PermissionState>("loading")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (desktopRuntime !== true) return
    let active = true
    void isPermissionGranted()
      .then((granted) => {
        if (active) setPermission(granted ? "granted" : "prompt")
      })
      .catch((reason: unknown) => {
        if (active) {
          setPermission("unavailable")
          setError(errorMessage(reason))
        }
      })
    return () => {
      active = false
    }
  }, [desktopRuntime])

  async function updatePreference(
    update: Partial<typeof preferences>
  ) {
    setError(null)
    try {
      await writeNotificationPreferences(update)
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  async function allowWindowsNotifications() {
    if (pending || desktopRuntime !== true) return
    setPending(true)
    setError(null)
    try {
      const result = await requestPermission()
      const granted = result === "granted" || (await isPermissionGranted())
      setPermission(granted ? "granted" : result === "denied" ? "denied" : "prompt")
      if (!granted) {
        setError("Windows n’a pas accordé l’autorisation. Vérifie les paramètres de notification de Windows.")
      }
    } catch (reason) {
      setError(errorMessage(reason))
      setPermission("unavailable")
    } finally {
      setPending(false)
    }
  }

  async function testNativeNotification(test: (typeof notificationTests)[number]) {
    if (pending || desktopRuntime !== true || !preferences.nativeEnabled) return
    setPending(true)
    setError(null)
    try {
      let granted = await isPermissionGranted()
      if (!granted) {
        const result = await requestPermission()
        granted = result === "granted" || (await isPermissionGranted())
        setPermission(granted ? "granted" : result === "denied" ? "denied" : "prompt")
      }
      if (!granted) {
        setError("Autorisation Windows refusée. Autorise les notifications FXMP OS dans les paramètres de Windows.")
        return
      }
      await sendNotification({
        title: test.title,
        body: test.body,
      })
      toast.success("Notification Windows envoyée", {
        description: `Exemple « ${test.label} » transmis au plugin Tauri.`,
      })
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setPending(false)
    }
  }

  function testToast(kind: "success" | "info" | "warning" | "error") {
    const message = "Aperçu de notification FXMP OS"
    const description = "Voici le rendu des notifications dans l’application."
    if (kind === "success") toast.success(message, { description })
    if (kind === "info") toast.info(message, { description })
    if (kind === "warning") toast.warning(message, { description })
    if (kind === "error") toast.error(message, { description })
  }

  const permissionText = {
    loading: "Vérification de l’autorisation…",
    granted: "Autorisation Windows accordée.",
    prompt: "Windows demandera l’autorisation au premier envoi.",
    denied: "Autorisation refusée dans Windows.",
    unavailable: "Disponible dans l’application FXMP OS sous Windows.",
  }[desktopRuntime === false ? "unavailable" : permission]

  const positions: { value: NotificationPosition; label: string }[] = [
    { value: "top-left", label: "En haut à gauche" },
    { value: "top-center", label: "En haut au centre" },
    { value: "top-right", label: "En haut à droite" },
    { value: "bottom-left", label: "En bas à gauche" },
    { value: "bottom-center", label: "En bas au centre" },
    { value: "bottom-right", label: "En bas à droite" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BellIcon aria-hidden="true" className="size-4 text-primary" />
              Notifications FXMP OS
            </CardTitle>
            <CardDescription>
              Les alertes restent dans l’application quand elle est ouverte et
              peuvent apparaître dans Windows lorsqu’elle est en arrière-plan.
            </CardDescription>
          </div>
          <Badge variant="outline">Windows</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Notifications dans l’application</p>
              <p className="text-xs text-muted-foreground">
                Toasts Sonner pendant que FXMP OS est au premier plan.
              </p>
            </div>
            <Switch
              aria-label="Activer les notifications dans FXMP OS"
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) => void updatePreference({ inAppEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Notifications Windows</p>
              <p className="text-xs text-muted-foreground">
                Notifications natives Windows quand FXMP OS n’est pas au premier plan.
              </p>
            </div>
            <Switch
              aria-label="Activer les notifications Windows"
              checked={preferences.nativeEnabled}
              disabled={desktopRuntime !== true}
              onCheckedChange={(checked) => void updatePreference({ nativeEnabled: checked })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Autorisation système</p>
                <p aria-live="polite" className="text-xs text-muted-foreground" role="status">
                  {permissionText}
                </p>
              </div>
            </div>
            <Button
              disabled={
                desktopRuntime !== true ||
                pending ||
                permission === "granted" ||
                !preferences.nativeEnabled
              }
              onClick={() => void allowWindowsNotifications()}
              size="sm"
              variant="outline"
            >
              {permission === "granted" ? <CheckIcon data-icon="inline-start" /> : null}
              {permission === "granted" ? "Autorisé" : "Autoriser dans Windows"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apparence des toasts</CardTitle>
          <CardDescription>
            Position, durée et fermeture des notifications affichées dans FXMP OS.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            Position
            <Select
              onValueChange={(value) => {
                if (value) void updatePreference({ position: value as NotificationPosition })
              }}
              value={preferences.position}
            >
              <SelectTrigger className="w-full" aria-label="Position des notifications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Durée d’affichage
            <Select
              onValueChange={(value) => {
                if (value) void updatePreference({ duration: Number(value) })
              }}
              value={String(preferences.duration)}
            >
              <SelectTrigger className="w-full" aria-label="Durée d’affichage des notifications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3000">3 secondes</SelectItem>
                <SelectItem value="5000">5 secondes</SelectItem>
                <SelectItem value="8000">8 secondes</SelectItem>
                <SelectItem value="0">Jusqu’à fermeture</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm">Bouton fermer</span>
            <Switch
              aria-label="Afficher le bouton de fermeture des notifications"
              checked={preferences.closeButton}
              onCheckedChange={(checked) => void updatePreference({ closeButton: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu des notifications dans FXMP OS</CardTitle>
          <CardDescription>
            Ces aperçus Sonner s’affichent dans l’interface quand FXMP OS est ouvert.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => testToast("success")} size="sm" variant="outline">
              <CheckIcon data-icon="inline-start" /> Succès
            </Button>
            <Button onClick={() => testToast("info")} size="sm" variant="outline">
              <InfoIcon data-icon="inline-start" /> Information
            </Button>
            <Button onClick={() => testToast("warning")} size="sm" variant="outline">
              <TriangleAlertIcon data-icon="inline-start" /> Attention
            </Button>
            <Button onClick={() => testToast("error")} size="sm" variant="outline">
              <XIcon data-icon="inline-start" /> Erreur
            </Button>
          </div>
          {error ? (
            <p aria-live="polite" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {!preferences.inAppEnabled ? (
            <p className="text-xs text-muted-foreground">
              Les aperçus visuels restent disponibles même si les notifications de l’application sont désactivées.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon aria-hidden="true" className="size-4 text-primary" />
            Tests du plugin de notifications Tauri
          </CardTitle>
          <CardDescription>
            Envoie un exemple natif au centre de notifications Windows. Les boutons changent le contenu;
            Windows choisit lui-même l’apparence et le niveau d’interruption.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {notificationTests.map((test) => {
              const Icon =
                test.kind === "success"
                  ? CheckIcon
                  : test.kind === "info"
                    ? InfoIcon
                    : test.kind === "warning"
                      ? TriangleAlertIcon
                      : XIcon
              return (
                <Button
                  key={test.kind}
                  disabled={desktopRuntime !== true || !preferences.nativeEnabled || pending}
                  onClick={() => void testNativeNotification(test)}
                  size="sm"
                  variant="outline"
                >
                  <Icon data-icon="inline-start" />
                  {pending ? "Envoi…" : test.label}
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Sous Windows, les notifications du plugin Tauri sont prises en charge pour l’application installée.
            En mode développement, Windows peut leur attribuer l’identité PowerShell. Si un envoi échoue,
            le message d’erreur s’affiche ici.
          </p>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Les préférences sont stockées localement dans le store FXMP OS. Aucune donnée du PC,
        aucun identifiant de session et aucun contenu privé n’est ajouté aux notifications.
      </p>
    </div>
  )
}
