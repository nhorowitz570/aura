"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Droplet, Dumbbell, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: Flame,
    title: "Calories & Macros",
    description:
      "Track daily intake, hit protein goals, and log meals effortlessly.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description:
      "Personalized guidance that learns your preferences and adapts to your goals.",
  },
  {
    icon: Droplet,
    title: "Hydration",
    description:
      "Stay on top of water intake with quick presets and progress tracking.",
  },
  {
    icon: Dumbbell,
    title: "Workouts",
    description:
      "Follow training programs, log sets, and track progress over time.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <motion.section
        className="flex flex-col items-center justify-center min-h-[90vh] px-4 text-center"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease }}
        >
          <Image
            src="/icon-512.png"
            width={80}
            height={80}
            alt="Aura"
            className="mx-auto"
            priority
          />
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-4xl font-semibold tracking-tight mt-6"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease }}
        >
          Meet Aura
        </motion.h1>

        <motion.p
          className="text-lg text-muted-foreground mt-3"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease }}
        >
          The quiet, focused health tracker.
        </motion.p>

        <motion.div
          className="mt-8"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease }}
        >
          <Button size="lg" asChild>
            <Link href="/signup">Request Access</Link>
          </Button>
        </motion.div>

        <motion.p
          className="text-sm text-muted-foreground mt-4"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease }}
        >
          Invite-only early access. Access code required.
        </motion.p>
      </motion.section>

      {/* Features */}
      <section className="max-w-3xl mx-auto px-4 py-24 space-y-12">
        <div className="space-y-2 text-center">
          <motion.h2
            className="text-2xl font-semibold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease }}
          >
            Everything you need
          </motion.h2>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, ease, delay: 0.1 }}
          >
            One app for nutrition, hydration, workouts, and AI guidance.
          </motion.p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, ease, delay: i * 0.1 }}
            >
              <Card className="p-6 space-y-2">
                <feature.icon className="h-8 w-8 text-muted-foreground" />
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <motion.section
        className="py-24 text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4, ease }}
      >
        <h2 className="text-xl font-semibold">Ready to start?</h2>
        <Button size="lg" asChild>
          <Link href="/signup">Request Access</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Invite-only early access.</p>
      </motion.section>
    </div>
  );
}
