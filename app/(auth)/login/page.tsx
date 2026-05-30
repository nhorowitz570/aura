"use client";
import { useActionState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { signInWithEmail } from "@/server/actions/auth";
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

export default function LoginPage() {
  const [state, action, pending] = useActionState(signInWithEmail, null);

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
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your Aura account.</p>
        </motion.div>

        <motion.form
          action={action}
          className="space-y-4"
          variants={item}
          animate={state?.error ? { x: [0, -5, 5, -5, 5, 0] } : undefined}
          transition={{ duration: 0.3 }}
        >
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </motion.div>
          <motion.div className="space-y-2" variants={item}>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
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
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>

        <motion.p className="text-center text-sm text-muted-foreground" variants={item}>
          New here?{" "}
          <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </motion.p>
      </motion.div>
    </>
  );
}
