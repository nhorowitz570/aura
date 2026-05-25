"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { calcGoals, ageFromDob, lbToKg, inToCm } from "@/lib/units";
import { FEATURE_LABEL, FEATURE_DESCRIPTION } from "@/lib/features";
import { ALL_FEATURES } from "@/types/database";
import type {
  Profile, Units, Sex, FeatureId, PrimaryGoal, ActivityLevel, ExperienceLevel,
} from "@/types/database";
import { updateProfile, markOnboarded } from "@/server/actions/profile";
import { updateGoals } from "@/server/actions/goals";
import { cn } from "@/lib/utils";

const STEPS = [
  "Welcome",
  "Units",
  "Features",
  "Profile",
  "Activity",
  "Diet",
  "Primary goal",
  "Daily goals",
  "Review",
] as const;

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo",
  "Mediterranean", "Gluten-free", "Dairy-free", "Halal", "Kosher",
  "Intermittent fasting", "Low-carb",
];

const PRIMARY_GOALS: { id: PrimaryGoal; label: string; description: string }[] = [
  { id: "lose_weight",    label: "Lose weight",        description: "Sustainable calorie deficit." },
  { id: "build_muscle",   label: "Build muscle",       description: "Higher protein, strength focus." },
  { id: "maintain",       label: "Maintain",           description: "Stay where I am, eat well." },
  { id: "endurance",      label: "Endurance",          description: "Cardio + running goals." },
  { id: "general_health", label: "General health",     description: "Better habits across the board." },
];

const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; description: string }[] = [
  { id: "sedentary", label: "Sedentary",  description: "Mostly sitting. Little to no exercise." },
  { id: "light",     label: "Light",      description: "1–3 days/week of light exercise." },
  { id: "moderate",  label: "Moderate",   description: "3–5 days/week of moderate exercise." },
  { id: "active",    label: "Active",     description: "6+ days/week of intense exercise." },
  { id: "athlete",   label: "Athlete",    description: "Twice daily or physical job + training." },
];

const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string; description: string }[] = [
  { id: "beginner",     label: "Beginner",     description: "Less than 6 months consistent." },
  { id: "intermediate", label: "Intermediate", description: "6 months – 2 years." },
  { id: "advanced",     label: "Advanced",     description: "2+ years consistent training." },
];

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();

  // Shared state
  const [units, setUnits] = useState<Units>(profile.units);
  const [enabled, setEnabled] = useState<FeatureId[]>(profile.enabled_features?.length ? profile.enabled_features : [...ALL_FEATURES]);
  const [name, setName] = useState(profile.display_name ?? "");
  const [dob, setDob] = useState(profile.dob ?? "");
  const [sex, setSex] = useState<Sex>(profile.sex ?? "prefer_not_to_say");
  const [heightStr, setHeightStr] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [activity, setActivity] = useState<ActivityLevel | null>(profile.activity_level);
  const [experience, setExperience] = useState<ExperienceLevel | null>(profile.experience_level);
  const [dietary, setDietary] = useState<string[]>(profile.dietary ?? []);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(profile.primary_goal);
  const [targetDate, setTargetDate] = useState<string>(profile.target_date ?? "");
  const [goals, setGoals] = useState({ calories: 2200, protein_g: 150, water_ml: 2500, sleep_min: 480 });

  const imperial = units === "imperial";
  const totalSteps = STEPS.length;

  const next = () => setStep((s) => Math.min(totalSteps - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const toggleFeature = (f: FeatureId) =>
    setEnabled((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));

  const toggleDietary = (d: string) =>
    setDietary((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));

  const onUnitsContinue = () => start(async () => { await updateProfile({ units }); next(); });
  const onFeaturesContinue = () => start(async () => { await updateProfile({ enabled_features: enabled }); next(); });

  const onProfileContinue = () => {
    const heightNum = parseFloat(heightStr);
    const weightNum = parseFloat(weightStr);
    if (!Number.isFinite(heightNum) || !Number.isFinite(weightNum) || !dob) {
      toast.error("Fill in height, weight, and date of birth");
      return;
    }
    const height_cm = imperial ? inToCm(heightNum) : heightNum;
    const weight_kg = imperial ? lbToKg(weightNum) : weightNum;
    start(async () => {
      await updateProfile({ display_name: name, dob, sex, height_cm, weight_kg });
      const g = calcGoals({ weight_kg, height_cm, age: ageFromDob(dob), sex });
      setGoals(g);
      next();
    });
  };

  const onActivityContinue = () => start(async () => {
    await updateProfile({ activity_level: activity, experience_level: experience });
    next();
  });

  const onDietContinue = () => start(async () => {
    await updateProfile({ dietary });
    next();
  });

  const onGoalContinue = () => start(async () => {
    await updateProfile({ primary_goal: primaryGoal, target_date: targetDate || null });
    next();
  });

  const onDailyGoalsContinue = () => start(async () => { await updateGoals(goals); next(); });

  const onFinish = () => start(async () => {
    await markOnboarded();
    toast.success("All set");
    router.replace("/");
    router.refresh();
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Step {step + 1} of {totalSteps}
          </p>
          {step > 0 && step < totalSteps - 1 && (
            <button type="button" onClick={() => onFinish()} className="text-xs text-muted-foreground hover:text-foreground">
              Skip
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-foreground" : "bg-secondary")}
            />
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{STEPS[step]}</h1>
      </div>

      <Card className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <div className="text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 text-xl font-semibold">Welcome to Aura</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  A quiet, focused health tracker. We&apos;ll take a couple of minutes to set things up — units, the features you want, and your goals.
                </p>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-sm text-muted-foreground">Pick the units you prefer. You can change this later.</p>
                <div className="mt-4 inline-flex rounded-md border p-0.5">
                  {(["imperial", "metric"] as Units[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnits(u)}
                      className={cn(
                        "px-4 py-2 text-sm rounded-[6px] capitalize transition-colors",
                        units === u ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-sm text-muted-foreground">Choose the categories you want. You can change this anytime in Settings.</p>
                <p className="mt-1 text-xs text-muted-foreground">Home, Goals, Assistant and Settings are always available.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ALL_FEATURES.map((f) => {
                    const on = enabled.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFeature(f)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          on ? "border-foreground/30 bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{FEATURE_LABEL[f]}</p>
                          {on && <Check className="h-4 w-4" />}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{FEATURE_DESCRIPTION[f]}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="What should we call you?" />
                </div>
                <div>
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="sex">Sex</Label>
                  <select
                    id="sex"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as Sex)}
                    className="mt-1.5 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="height">Height {imperial ? "(in)" : "(cm)"}</Label>
                  <Input id="height" inputMode="decimal" value={heightStr} onChange={(e) => setHeightStr(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="weight">Weight {imperial ? "(lb)" : "(kg)"}</Label>
                  <Input id="weight" inputMode="decimal" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Activity level</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ACTIVITY_LEVELS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setActivity(a.id)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          activity === a.id ? "border-foreground/30 bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        <p className="text-sm font-medium">{a.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Training experience</Label>
                  <div className="mt-2 inline-flex rounded-md border p-0.5">
                    {EXPERIENCE_LEVELS.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setExperience(e.id)}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-[6px] transition-colors",
                          experience === e.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <p className="text-sm text-muted-foreground">Anything we should know about? (Optional)</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((d) => {
                    const on = dietary.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDietary(d)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-colors",
                          on ? "border-foreground/30 bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Primary goal</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {PRIMARY_GOALS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setPrimaryGoal(g.id)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          primaryGoal === g.id ? "border-foreground/30 bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        <p className="text-sm font-medium">{g.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="target_date">Target date (optional)</Label>
                  <Input id="target_date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            )}

            {step === 7 && (
              <div>
                <p className="text-sm text-muted-foreground">Auto-calculated from your profile. Tweak any of these.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="g-cal">Calories</Label>
                    <Input id="g-cal" inputMode="numeric" value={goals.calories} onChange={(e) => setGoals((g) => ({ ...g, calories: +e.target.value || 0 }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="g-pro">Protein (g)</Label>
                    <Input id="g-pro" inputMode="numeric" value={goals.protein_g} onChange={(e) => setGoals((g) => ({ ...g, protein_g: +e.target.value || 0 }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="g-water">Water (ml)</Label>
                    <Input id="g-water" inputMode="numeric" value={goals.water_ml} onChange={(e) => setGoals((g) => ({ ...g, water_ml: +e.target.value || 0 }))} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="g-sleep">Sleep (min)</Label>
                    <Input id="g-sleep" inputMode="numeric" value={goals.sleep_min} onChange={(e) => setGoals((g) => ({ ...g, sleep_min: +e.target.value || 0 }))} className="mt-1.5" />
                  </div>
                </div>
              </div>
            )}

            {step === 8 && (
              <ReviewStep
                name={name}
                units={units}
                enabled={enabled}
                activity={activity}
                experience={experience}
                dietary={dietary}
                primaryGoal={primaryGoal}
                targetDate={targetDate}
                goals={goals}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={prev} disabled={step === 0 || pending}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step === 0 && (
          <Button onClick={next} disabled={pending}>Get started <ArrowRight className="ml-1 h-4 w-4" /></Button>
        )}
        {step === 1 && <Button onClick={onUnitsContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 2 && <Button onClick={onFeaturesContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 3 && <Button onClick={onProfileContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 4 && <Button onClick={onActivityContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 5 && <Button onClick={onDietContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 6 && <Button onClick={onGoalContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 7 && <Button onClick={onDailyGoalsContinue} disabled={pending}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>}
        {step === 8 && (
          <Button onClick={onFinish} disabled={pending}>
            <Check className="mr-1 h-4 w-4" /> Finish
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  name, units, enabled, activity, experience, dietary, primaryGoal, targetDate, goals,
}: {
  name: string;
  units: Units;
  enabled: FeatureId[];
  activity: ActivityLevel | null;
  experience: ExperienceLevel | null;
  dietary: string[];
  primaryGoal: PrimaryGoal | null;
  targetDate: string;
  goals: { calories: number; protein_g: number; water_ml: number; sleep_min: number };
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Quick review. You can change any of these later from Settings.</p>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row label="Name" value={name || "—"} />
        <Row label="Units" value={units} />
        <Row label="Features" value={enabled.map((f) => FEATURE_LABEL[f]).join(", ") || "None"} />
        <Row label="Activity" value={activity ?? "—"} />
        <Row label="Experience" value={experience ?? "—"} />
        <Row label="Diet" value={dietary.length ? dietary.join(", ") : "—"} />
        <Row label="Primary goal" value={primaryGoal ?? "—"} />
        <Row label="Target date" value={targetDate || "—"} />
        <Row label="Daily calories" value={String(goals.calories)} />
        <Row label="Daily protein" value={`${goals.protein_g} g`} />
        <Row label="Daily water" value={`${goals.water_ml} ml`} />
        <Row label="Sleep target" value={`${goals.sleep_min} min`} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b py-1.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
