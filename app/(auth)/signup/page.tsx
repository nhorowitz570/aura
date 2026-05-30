"use client";
import { useActionState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { signUp } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <>
      <Link
        href="/"
        className="fixed left-4 top-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Aura
      </Link>

      <motion.div
        className="space-y-6"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="space-y-1" variants={item}>
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">Track workouts, nutrition, sleep, and more.</p>
        </motion.div>

        <motion.form
          action={action}
          className="space-y-4"
          variants={item}
          animate={state?.error ? { x: [0, -5, 5, -5, 5, 0] } : undefined}
          transition={{ duration: 0.3 }}
        >
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" type="text" required autoComplete="name" />
          </motion.div>
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </motion.div>
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </motion.div>
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="accessCode">Access code</Label>
            <Input
              id="accessCode"
              name="accessCode"
              type="text"
              required
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="font-mono tracking-wider uppercase"
            />
          </motion.div>

          {state?.error && (
            <motion.p
              className="text-sm text-destructive"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {state.error}
            </motion.p>
          )}

          <motion.div variants={item}>
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>

        <motion.p className="text-center text-sm text-muted-foreground" variants={item}>
          Have an account?{" "}
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </>
  );
}
