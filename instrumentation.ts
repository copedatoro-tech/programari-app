import * as Sentry from "@sentry/nextjs";

export async function register() {
  // 🔒 FIX: Sentry.init() deschide conexiuni de retea si timere de flush
  // periodic care nu se inchid niciodata singure — gandite pentru un server
  // care ruleaza continuu, nu pentru un proces de build de o singura data.
  // Asta tinea procesul Node.js viu la infinit dupa "next build", desi
  // build-ul insusi se termina corect (vizibil in trace-ul din .next).
  // Sarim peste initializare in faza de build — Sentry nu are ce raporta
  // oricum in acest moment, doar la request-uri reale in productie/dev.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;