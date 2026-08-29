import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Calculator as CalcIcon, Percent } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/calculator")({
  head: () => ({ meta: [{ title: "Calculator | EMD Inventory" }] }),
  component: CalculatorPage,
});

type Mode = "repurchase" | "referral" | "matching";

const rates: Record<Mode, number> = {
  repurchase: 0.2,
  referral: 0.25,
  matching: 0.15,
};

const money = (value: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(value);

function CalculatorPage() {
  const [mode, setMode] = useState<Mode>("repurchase");
  const [baseAmount, setBaseAmount] = useState("2500");
  const [bonus, setBonus] = useState("0");

  const rate = rates[mode];
  const computed = Number(baseAmount || 0) * rate;

  return (
    <AppShell title="Calculator" description="Compute bonuses and earnings for repurchase, referral, and matching plans">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <CalcIcon className="size-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Commission calculator</h2>
          </div>

          <div className="mt-4 inline-flex rounded-lg border border-border bg-muted p-1">
            {(["repurchase", "referral", "matching"] as Mode[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={[
                  "rounded-md px-3 py-2 text-sm font-medium capitalize transition",
                  mode === tab ? "bg-white text-primary shadow-sm" : "text-muted-foreground",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Amount</label>
              <Input
                type="number"
                value={baseAmount}
                onChange={(event) => {
                  setBaseAmount(event.target.value);
                  setBonus(String(Number(event.target.value || 0) * rate));
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Rate</label>
              <Input value={`${(rate * 100).toFixed(0)}%`} readOnly />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">Bonus</label>
              <Input value={bonus} onChange={(event) => setBonus(event.target.value)} />
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Computed bonus</p>
              <p className="mt-2 text-4xl font-semibold text-primary">{money(computed)}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Percent className="size-5" /></div>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-border bg-slate-50 p-4">
            <div className="flex justify-between text-sm"><span>Base value</span><span>{money(Number(baseAmount || 0))}</span></div>
            <div className="flex justify-between text-sm"><span>Rate</span><span>{(rate * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between text-sm font-medium"><span>Potential payout</span><span>{money(computed)}</span></div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">Plan summary</p>
            <p className="mt-2 text-base font-medium capitalize">{mode} commission</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-primary"><ArrowUpRight className="size-4" /> The payout updates instantly as values change.</div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
