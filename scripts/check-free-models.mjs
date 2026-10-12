#!/usr/bin/env node

/**
 * TIVRA News — Pollinations Live Zero-Cost Model Inspector
 *
 * Scans Pollinations API catalogs (official + community) in real time.
 * Filters strictly for text generation models that are:
 * 1. 100% Free (Prompt: 0 Pollen, Completion: 0 Pollen)
 * 2. Not paid_only
 * 3. Live and healthy (success rate >= 75%)
 *
 * Usage: node scripts/check-free-models.mjs
 */

async function checkFreeModels() {
  console.log("==================================================================");
  console.log("  POLLINATIONS AI LIVE AUDIT: ZERO-COST & UNLIMITED MODELS CHECK  ");
  console.log("==================================================================\n");
  console.log("Fetching live catalog from gen.pollinations.ai...");

  try {
    const [resMain, resComm] = await Promise.all([
      fetch("https://gen.pollinations.ai/models"),
      fetch("https://gen.pollinations.ai/models?community=true&reliability=all"),
    ]);

    if (!resMain.ok || !resComm.ok) {
      throw new Error(`Failed to fetch catalogs (Main: ${resMain.status}, Comm: ${resComm.status})`);
    }

    const mainModels = await resMain.json();
    const commModels = await resComm.json();
    const allModels = [...mainModels, ...commModels];

    // De-duplicate by name
    const seen = new Set();
    const uniqueModels = [];
    for (const m of allModels) {
      const id = m.name || m.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        uniqueModels.push(m);
      }
    }

    console.log(`Audited ${uniqueModels.length} total models in live registry.\n`);

    const trueZeroCost = [];
    const meteredModels = [];

    for (const m of uniqueModels) {
      if (m.category !== "text") continue;

      const pIn = parseFloat(m.pricing?.promptTextTokens || "0");
      const pOut = parseFloat(m.pricing?.completionTextTokens || "0");
      const isPaidOnly = m.paid_only === true;
      const status = m.health?.status || "unknown";
      const successRate = typeof m.health?.success_rate === "number" ? m.health.success_rate : 0;

      if (pIn === 0 && pOut === 0 && !isPaidOnly) {
        if (status !== "down" && successRate >= 75) {
          trueZeroCost.push({
            name: m.name,
            status,
            successRate: Math.round(successRate) + "%",
            rpm: m.rpm || 15,
            description: m.description ? m.description.slice(0, 60) + "..." : "Community model",
          });
        }
      } else {
        meteredModels.push({
          name: m.name,
          pIn,
          pOut,
          isPaidOnly,
        });
      }
    }

    console.log(`[?] VERIFIED 100% ZERO-COST ACTIVE TEXT MODELS (${trueZeroCost.length} available):`);
    console.log("These models cost strictly 0 Pollen ($0.00) and are currently healthy:\n");

    if (trueZeroCost.length === 0) {
      console.log("  ? No active zero-cost community models meet the 75% health threshold right now.");
    } else {
      console.table(trueZeroCost);
    }

    console.log("\n[?] EXAMPLES OF METERED MODELS TO STRICTLY AVOID (THEY CHARGE POLLEN):");
    const warningSample = meteredModels
      .filter((m) =>
        m.name.includes("nano") ||
        m.name.includes("deepseek") ||
        m.name.includes("qwen") ||
        m.name.includes("mistral") ||
        m.name.includes("jev")
      )
      .slice(0, 8);

    console.table(warningSample);

    console.log("\nZero-cost audit complete. Pipeline is protected.\n");
  } catch (err) {
    console.error("Error during audit:", err.message);
  }
}

checkFreeModels();
