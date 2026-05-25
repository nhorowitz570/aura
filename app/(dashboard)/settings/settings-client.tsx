"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { RefreshCw, Download, LogOut, BookMarked, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ACCENTS, ACCENT_LABEL, ACCENT_SWATCH, type Accent } from "@/lib/accent";
import { DATA_SOURCES } from "@/lib/data-sources";
import { kgToLb, lbToKg, cmToIn, inToCm, mlToFlOz, flOzToMl } from "@/lib/units";
import type {
  Profile, Goals, AIMemory, Units, ThemeMode, AIPersonality, AIResponseLength, FeatureId,
} from "@/types/database";
import { ALL_FEATURES } from "@/types/database";
import { updateProfile } from "@/server/actions/profile";
import { updateGoals, recalcGoalsFromProfile } from "@/server/actions/goals";
import { exportUserData } from "@/server/actions/exportData";
import { signOut, deleteAccount } from "@/server/actions/auth";
import { PERSONALITIES, RESPONSE_LENGTHS } from "@/lib/ai/preferences";
import { FEATURE_LABEL, FEATURE_DESCRIPTION } from "@/lib/features";
import { MemoryModal } from "@/components/ai/memory-modal";

const SECTIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "units", label: "Units" },
  { id: "features", label: "Features" },
  { id: "profile", label: "Profile" },
  { id: "goals", label: "Goals" },
  { id: "sources", label: "Data sources" },
  { id: "ai", label: "AI preferences" },
  { id: "export", label: "Data export" },
  { id: "account", label: "Account" },
];

export function SettingsClient({
  profile,
  goals,
  memories,
}: {
  profile: Profile;
  goals: Goals | null;
  memories: AIMemory[];
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personalize your experience.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="hidden md:block">
          <ul className="sticky top-20 space-y-0.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10">
          <AppearanceSection profile={profile} />
          <UnitsSection profile={profile} />
          <FeaturesSection profile={profile} />
          <ProfileSection profile={profile} />
          <GoalsSection goals={goals} units={profile.units} />
          <DataSourcesSection profile={profile} />
          <AIPreferencesSection profile={profile} memories={memories} />
          <ExportSection />
          <AccountSection />
        </div>
      </div>
    </div>
  );
}

function SectionShell({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <header className="mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </header>
      <Card className="p-5">{children}</Card>
    </section>
  );
}

/* ----------------------------- Appearance ----------------------------- */

function AppearanceSection({ profile }: { profile: Profile }) {
  const { theme, setTheme } = useTheme();
  const [pending, start] = useTransition();
  const router = useRouter();

  const onTheme = (t: ThemeMode) => {
    setTheme(t);
    start(async () => {
      const res = await updateProfile({ theme: t });
      if ("error" in res && res.error) toast.error(res.error);
    });
  };

  const onAccent = (a: Accent) => {
    document.documentElement.dataset.accent = a;
    start(async () => {
      const res = await updateProfile({ accent: a });
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  };

  const themes: { v: ThemeMode; label: string }[] = [
    { v: "light", label: "Light" },
    { v: "dark", label: "Dark" },
    { v: "system", label: "System" },
  ];

  const currentAccent = profile.accent;
  const currentTheme = (theme as ThemeMode) ?? profile.theme;

  return (
    <SectionShell id="appearance" title="Appearance" description="Theme and accent color.">
      <div className="space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Theme</Label>
          <div className="mt-2 inline-flex rounded-md border p-0.5">
            {themes.map((t) => (
              <button
                key={t.v}
                type="button"
                disabled={pending}
                onClick={() => onTheme(t.v)}
                className={
                  "px-3 py-1.5 text-sm rounded-[6px] transition-colors " +
                  (currentTheme === t.v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Accent</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const active = currentAccent === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onAccent(a)}
                  disabled={pending}
                  aria-label={ACCENT_LABEL[a]}
                  className={
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors " +
                    (active ? "border-foreground/30 bg-secondary" : "border-input hover:bg-secondary/60")
                  }
                >
                  <span className={"h-3.5 w-3.5 rounded-full ring-1 ring-foreground/10 " + ACCENT_SWATCH[a]} />
                  {ACCENT_LABEL[a]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Units ----------------------------- */

function UnitsSection({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (u: Units) => start(async () => {
    const res = await updateProfile({ units: u });
    if ("error" in res && res.error) toast.error(res.error);
    else router.refresh();
  });

  return (
    <SectionShell id="units" title="Units" description="Imperial uses pounds, feet/inches, and fluid ounces.">
      <div className="inline-flex rounded-md border p-0.5">
        {(["imperial", "metric"] as Units[]).map((u) => (
          <button
            key={u}
            type="button"
            disabled={pending}
            onClick={() => set(u)}
            className={
              "px-3 py-1.5 text-sm rounded-[6px] transition-colors capitalize " +
              (profile.units === u ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {u}
          </button>
        ))}
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Profile ----------------------------- */

function RangeSlider({
  id, min, max, step, value, onChange,
}: { id?: string; min: number; max: number; step: number; value: number; onChange: (n: number) => void }) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-foreground"
    />
  );
}

function ProfileSection({ profile }: { profile: Profile }) {
  const imperial = profile.units === "imperial";
  const [name, setName] = useState(profile.display_name ?? "");
  const [dob, setDob] = useState(profile.dob ?? "");
  const [sex, setSex] = useState(profile.sex ?? "prefer_not_to_say");

  // Height: always store cm internally. Imperial UI splits cm into feet + inches.
  const initialCm = profile.height_cm ?? (imperial ? inToCm(5 * 12 + 8) : 170);
  const [heightCm, setHeightCmRaw] = useState<number>(initialCm);
  const [heightTouched, setHeightTouched] = useState<boolean>(profile.height_cm != null);
  const setHeightCm = (n: number) => { setHeightCmRaw(n); setHeightTouched(true); };
  const totalIn = cmToIn(heightCm);
  const ft = Math.floor(totalIn / 12);
  const inches = Math.max(0, Math.min(11, Math.round(totalIn - ft * 12)));
  const setFtIn = (nextFt: number, nextIn: number) => {
    const clampedIn = Math.max(0, Math.min(11, nextIn));
    setHeightCm(inToCm(nextFt * 12 + clampedIn));
  };

  // Weight: always store kg internally. Imperial UI shows lb.
  const initialKg = profile.weight_kg ?? (imperial ? lbToKg(170) : 75);
  const [weightKg, setWeightKgRaw] = useState<number>(initialKg);
  const [weightTouched, setWeightTouched] = useState<boolean>(profile.weight_kg != null);
  const setWeightKg = (n: number) => { setWeightKgRaw(n); setWeightTouched(true); };

  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () => start(async () => {
    const res = await updateProfile({
      display_name: name,
      dob: dob || null,
      sex,
      height_cm: heightTouched && Number.isFinite(heightCm) ? Math.round(heightCm * 10) / 10 : null,
      weight_kg: weightTouched && Number.isFinite(weightKg) ? Math.round(weightKg * 10) / 10 : null,
    });
    if ("error" in res && res.error) toast.error(res.error);
    else { toast.success("Profile saved"); router.refresh(); }
  });

  // Slider ranges (in display units)
  const lb = kgToLb(weightKg);
  const weightDisplay = imperial ? `${lb.toFixed(1)} lb` : `${weightKg.toFixed(1)} kg`;
  const heightDisplay = imperial ? `${ft}′ ${inches}″` : `${Math.round(heightCm)} cm`;

  return (
    <SectionShell id="profile" title="Profile" description="Used for accurate calorie + protein recommendations.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="sex">Sex</Label>
          <select
            id="sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as typeof sex)}
            className="mt-1.5 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <Label>Height</Label>
            <span className="text-sm tabular-nums text-muted-foreground">{heightDisplay}</span>
          </div>
          {imperial ? (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ft" className="text-[11px] uppercase tracking-wide text-muted-foreground">Feet</Label>
                <Input
                  id="ft"
                  inputMode="numeric"
                  value={ft}
                  onChange={(e) => setFtIn(parseInt(e.target.value) || 0, inches)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="in" className="text-[11px] uppercase tracking-wide text-muted-foreground">Inches</Label>
                <Input
                  id="in"
                  inputMode="numeric"
                  value={inches}
                  onChange={(e) => setFtIn(ft, parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <RangeSlider
                  min={48} max={84} step={1}
                  value={Math.round(totalIn)}
                  onChange={(n) => setHeightCm(inToCm(n))}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Input
                inputMode="numeric"
                value={Math.round(heightCm)}
                onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
              />
              <RangeSlider min={120} max={220} step={1} value={Math.round(heightCm)} onChange={setHeightCm} />
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <Label>Weight</Label>
            <span className="text-sm tabular-nums text-muted-foreground">{weightDisplay}</span>
          </div>
          {imperial ? (
            <div className="mt-2 space-y-2">
              <Input
                inputMode="decimal"
                value={lb.toFixed(1)}
                onChange={(e) => setWeightKg(lbToKg(parseFloat(e.target.value) || 0))}
              />
              <RangeSlider
                min={70} max={400} step={1}
                value={Math.round(lb)}
                onChange={(n) => setWeightKg(lbToKg(n))}
              />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <Input
                inputMode="decimal"
                value={weightKg.toFixed(1)}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
              />
              <RangeSlider min={30} max={180} step={1} value={Math.round(weightKg)} onChange={setWeightKg} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={save} disabled={pending}>Save profile</Button>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Goals ----------------------------- */

function GoalsSection({ goals, units }: { goals: Goals | null; units: Units }) {
  const imperial = units === "imperial";
  const [calories, setCalories] = useState(goals?.calories?.toString() ?? "2200");
  const [protein, setProtein] = useState(goals?.protein_g?.toString() ?? "150");
  // Display water in oz when imperial, ml otherwise. Always persist as ml.
  const initialWaterMl = goals?.water_ml ?? 2500;
  const [waterDisplay, setWaterDisplay] = useState<string>(() =>
    imperial ? Math.round(mlToFlOz(initialWaterMl)).toString() : initialWaterMl.toString(),
  );
  const [sleep, setSleep] = useState(goals?.sleep_min?.toString() ?? "480");
  const [pending, start] = useTransition();
  const router = useRouter();

  const waterMl = () => {
    const n = parseFloat(waterDisplay);
    if (!Number.isFinite(n)) return 0;
    return imperial ? Math.round(flOzToMl(n)) : Math.round(n);
  };

  const save = () => start(async () => {
    const res = await updateGoals({
      calories: parseInt(calories) || 0,
      protein_g: parseInt(protein) || 0,
      water_ml: waterMl(),
      sleep_min: parseInt(sleep) || 0,
    });
    if ("error" in res && res.error) toast.error(res.error);
    else { toast.success("Goals saved"); router.refresh(); }
  });

  const recalc = () => start(async () => {
    const res = await recalcGoalsFromProfile();
    if ("error" in res && res.error) toast.error(res.error);
    else if ("data" in res && res.data) {
      setCalories(String(res.data.calories ?? calories));
      setProtein(String(res.data.protein_g ?? protein));
      const ml = res.data.water_ml ?? waterMl();
      setWaterDisplay(imperial ? Math.round(mlToFlOz(ml)).toString() : String(ml));
      setSleep(String(res.data.sleep_min ?? sleep));
      toast.success("Recalculated from profile");
      router.refresh();
    }
  });

  return (
    <SectionShell id="goals" title="Goals" description="Daily targets used by the dashboard and assistant.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cals">Calories</Label>
          <Input id="cals" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="protein">Protein (g)</Label>
          <Input id="protein" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="water">Water ({imperial ? "fl oz" : "ml"})</Label>
          <Input id="water" inputMode="numeric" value={waterDisplay} onChange={(e) => setWaterDisplay(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="sleep">Sleep (min)</Label>
          <Input id="sleep" inputMode="numeric" value={sleep} onChange={(e) => setSleep(e.target.value)} className="mt-1.5" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={recalc} disabled={pending}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Recalculate from profile
        </Button>
        <Button onClick={save} disabled={pending}>Save goals</Button>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Data sources ----------------------------- */

function DataSourcesSection({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const setManual = (key: "manual_mode_sleep" | "manual_mode_vitals", v: boolean) =>
    start(async () => {
      const res = await updateProfile({ [key]: v });
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });

  return (
    <SectionShell
      id="sources"
      title="Data sources"
      description="Wearables are not connected yet. You can switch to manual mode to log sleep and vitals by hand."
    >
      <div className="space-y-2">
        {DATA_SOURCES.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-5" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="manual-sleep">Manual sleep logging</Label>
            <p className="text-xs text-muted-foreground">Enable to log sleep by hand on the Sleep page.</p>
          </div>
          <Switch id="manual-sleep" checked={profile.manual_mode_sleep} onCheckedChange={(v) => setManual("manual_mode_sleep", v)} disabled={pending} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="manual-vitals">Manual vitals logging</Label>
            <p className="text-xs text-muted-foreground">Enable to log resting HR, HRV, and BP by hand.</p>
          </div>
          <Switch id="manual-vitals" checked={profile.manual_mode_vitals} onCheckedChange={(v) => setManual("manual_mode_vitals", v)} disabled={pending} />
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Features ----------------------------- */

function FeaturesSection({ profile }: { profile: Profile }) {
  const [enabled, setEnabled] = useState<FeatureId[]>(profile.enabled_features ?? ALL_FEATURES);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = (id: FeatureId, on: boolean) => {
    const next = on ? Array.from(new Set([...enabled, id])) : enabled.filter((f) => f !== id);
    setEnabled(next);
    start(async () => {
      const res = await updateProfile({ enabled_features: next });
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  };

  return (
    <SectionShell id="features" title="Features" description="Show or hide categories. Home, Goals, Assistant and Settings are always on.">
      <div className="space-y-2">
        {ALL_FEATURES.map((f) => {
          const on = enabled.includes(f);
          return (
            <div key={f} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{FEATURE_LABEL[f]}</p>
                <p className="text-xs text-muted-foreground">{FEATURE_DESCRIPTION[f]}</p>
                {!on && <p className="mt-1 text-[11px] text-muted-foreground">Hidden from nav. Data is preserved.</p>}
              </div>
              <Switch checked={on} disabled={pending} onCheckedChange={(v) => toggle(f, v)} />
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ----------------------------- AI Preferences ----------------------------- */

function AIPreferencesSection({ profile, memories }: { profile: Profile; memories: AIMemory[] }) {
  const [personality, setPersonality] = useState<AIPersonality>(profile.ai_personality);
  const [length, setLength] = useState<AIResponseLength>(profile.ai_response_length);
  const [proactive, setProactive] = useState<boolean>(profile.ai_proactive);
  const [showSources, setShowSources] = useState<boolean>(profile.ai_show_sources);
  const [pending, start] = useTransition();
  const router = useRouter();

  const setField = (patch: Parameters<typeof updateProfile>[0]) => {
    start(async () => {
      const res = await updateProfile(patch);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  };

  const resetDefaults = () => {
    setPersonality("default");
    setLength("auto");
    setProactive(true);
    setShowSources(false);
    start(async () => {
      const res = await updateProfile({
        ai_personality: "default",
        ai_response_length: "auto",
        ai_proactive: true,
        ai_show_sources: false,
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Reset to defaults"); router.refresh(); }
    });
  };

  return (
    <SectionShell id="ai" title="AI preferences" description="Shape how your assistant talks to you and what it remembers.">
      <div className="space-y-6">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Personality</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PERSONALITIES.map((p) => {
              const active = personality === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={pending}
                  onClick={() => { setPersonality(p.id); setField({ ai_personality: p.id }); }}
                  className={
                    "rounded-md border p-3 text-left transition-colors " +
                    (active ? "border-foreground/30 bg-secondary" : "hover:bg-secondary/60")
                  }
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                  <p className="mt-2 rounded bg-background/60 px-2 py-1 text-[11px] italic text-muted-foreground">
                    “{p.sample}”
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Response length</Label>
          <div className="mt-2 inline-flex flex-wrap rounded-md border p-0.5">
            {RESPONSE_LENGTHS.map((l) => {
              const active = length === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={pending}
                  onClick={() => { setLength(l.id); setField({ ai_response_length: l.id }); }}
                  className={
                    "px-3 py-1.5 text-sm rounded-[6px] transition-colors " +
                    (active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                  title={l.description}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Proactive suggestions</Label>
              <p className="text-xs text-muted-foreground">Let the assistant volunteer tips unprompted.</p>
            </div>
            <Switch
              checked={proactive}
              disabled={pending}
              onCheckedChange={(v) => { setProactive(v); setField({ ai_proactive: v }); }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show data sources</Label>
              <p className="text-xs text-muted-foreground">Append a brief source tag to numbers (e.g. “7-day avg”).</p>
            </div>
            <Switch
              checked={showSources}
              disabled={pending}
              onCheckedChange={(v) => { setShowSources(v); setField({ ai_show_sources: v }); }}
            />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">AI memories</p>
              <p className="text-xs text-muted-foreground">{memories.length} {memories.length === 1 ? "item" : "items"} · tap to view</p>
            </div>
          </div>
          <MemoryModal
            memories={memories}
            trigger={
              <Button variant="outline" size="sm">
                View <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            }
          />
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetDefaults} disabled={pending}>
            Reset to defaults
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

/* ----------------------------- Export ----------------------------- */

function ExportSection() {
  const [pending, start] = useTransition();
  const onExport = () => start(async () => {
    const res = await exportUserData();
    if (res.error || !res.data) { toast.error(res.error ?? "Export failed"); return; }
    const blob = new Blob([res.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  return (
    <SectionShell id="export" title="Data export" description="Download a full JSON copy of your data.">
      <Button variant="outline" onClick={onExport} disabled={pending}>
        <Download className="mr-1.5 h-4 w-4" /> Download my data (JSON)
      </Button>
    </SectionShell>
  );
}

/* ----------------------------- Account ----------------------------- */

function AccountSection() {
  const onDelete = () => {
    if (!confirm("Delete your account? This signs you out and marks the account for deletion.")) return;
    deleteAccount();
  };
  return (
    <SectionShell id="account" title="Account">
      <div className="flex flex-wrap gap-3">
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </form>
        <Button variant="destructive" onClick={onDelete}>Delete account</Button>
      </div>
    </SectionShell>
  );
}
