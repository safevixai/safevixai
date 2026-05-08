"""
SafeVixAI Alert Service — Email notifications for application-level failures.

Sends alert emails when critical external services fail:
  - All LLM providers exhausted
  - Supabase auth/DB failures
  - External API failures (geocoding, weather, FDA, etc.)
  - Rate limit exhaustion across providers

Each alert includes:
  - What failed and why
  - 3 specific ways to fix the issue
  - Current provider health status

Env vars:
  ALERT_EMAIL          — Gmail address to send from
  ALERT_EMAIL_PASSWORD — Gmail App Password (not regular password)
  ALERT_EMAIL_TO       — Recipient (defaults to ALERT_EMAIL)

To generate a Gmail App Password:
  1. Go to https://myaccount.google.com/apppasswords
  2. Select "Mail" → "Other" → name it "SafeVixAI"
  3. Copy the 16-char password → set as ALERT_EMAIL_PASSWORD
"""

from __future__ import annotations

import logging
import os
import smtplib
import time
from collections import defaultdict
from datetime import datetime
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger("safevixai.alerts")

# ── Rate-limit alerts (don't spam the inbox) ────────────────────────────────
_last_alert_time: dict[str, float] = defaultdict(float)
ALERT_COOLDOWN_SECONDS = 300  # 5 min between same-type alerts


class AlertService:
    """Lightweight email alert service for SafeVixAI production monitoring."""

    def __init__(self):
        self.smtp_user = os.environ.get("ALERT_EMAIL", "")
        self.smtp_pass = os.environ.get("ALERT_EMAIL_PASSWORD", "")
        self.alert_to = os.environ.get("ALERT_EMAIL_TO", self.smtp_user)
        self.enabled = bool(self.smtp_user and self.smtp_pass)

        if self.enabled:
            logger.info("Alert service enabled → %s", self.alert_to)
        else:
            logger.info("Alert service disabled (set ALERT_EMAIL + ALERT_EMAIL_PASSWORD)")

    def alert_all_providers_failed(
        self,
        primary_provider: str,
        failed_providers: list[str],
        error_msg: str,
        user_message: str = "",
    ):
        """Alert when ALL LLM providers in the fallback chain have failed."""
        self._send(
            alert_type="llm_providers_exhausted",
            subject="🚨 ALL LLM Providers Failed",
            details=(
                f"Primary provider: {primary_provider}\n"
                f"Failed chain: {' → '.join(failed_providers)}\n"
                f"Error: {error_msg}\n"
                f"User query: {user_message[:100]}..."
            ),
            solutions=[
                "CHECK API KEYS — Log into each provider dashboard and verify keys are active:\n"
                "  • Groq: https://console.groq.com/keys\n"
                "  • Cerebras: https://cloud.cerebras.ai\n"
                "  • Gemini: https://aistudio.google.com/app/apikey\n"
                "  • OpenRouter: https://openrouter.ai/keys",
                "CHECK RATE LIMITS — Free-tier limits may be exhausted:\n"
                "  • Groq: 30 RPM / 14400 RPD\n"
                "  • Gemini: 15 RPM / 1M tok/day\n"
                "  • Wait 1 hour or upgrade to paid tier",
                "CHECK SERVICE STATUS — Provider may be down:\n"
                "  • Groq: https://status.groq.com\n"
                "  • Gemini: https://status.cloud.google.com\n"
                "  • Template fallback should ALWAYS work — if it also failed, "
                "  check the application code in providers/base.py",
            ],
        )

    def alert_external_api_failed(
        self,
        service_name: str,
        endpoint: str,
        status_code: int,
        error_msg: str,
    ):
        """Alert when an external API (weather, geocoding, FDA, etc.) fails."""
        self._send(
            alert_type=f"api_failure_{service_name}",
            subject=f"⚠️ External API Failed: {service_name}",
            details=(
                f"Service: {service_name}\n"
                f"Endpoint: {endpoint}\n"
                f"HTTP Status: {status_code}\n"
                f"Error: {error_msg}"
            ),
            solutions=[
                f"CHECK API KEY — Verify {service_name} credentials in .env:\n"
                "  • Run: python -c \"from config import Settings; s=Settings(); print(s)\"",
                f"CHECK RATE LIMITS — {service_name} may have daily/monthly limits:\n"
                "  • Free-tier APIs typically reset daily at midnight UTC\n"
                "  • Consider caching responses to reduce API calls",
                f"CHECK SERVICE STATUS — {service_name} may be experiencing downtime:\n"
                "  • The tool will return gracefully degraded data\n"
                "  • Users will see a 'service temporarily unavailable' message",
            ],
        )

    def alert_supabase_failed(self, operation: str, error_msg: str):
        """Alert when Supabase auth or database operations fail."""
        self._send(
            alert_type="supabase_failure",
            subject="🔴 Supabase Connection Failed",
            details=(
                f"Operation: {operation}\n"
                f"Error: {error_msg}"
            ),
            solutions=[
                "CHECK SUPABASE STATUS — https://status.supabase.com\n"
                "  • Free-tier projects auto-pause after 7 days of inactivity\n"
                "  • Go to https://supabase.com/dashboard → your project → Resume",
                "CHECK CREDENTIALS — Verify in backend/.env:\n"
                "  • SUPABASE_URL should be https://<project-ref>.supabase.co\n"
                "  • SUPABASE_KEY should be the anon/public key\n"
                "  • SUPABASE_SERVICE_KEY should be the service_role key",
                "CHECK NETWORK — The backend server may not have internet access:\n"
                "  • Test: curl -s https://api.supabase.co/health\n"
                "  • If on Cloud Run, check VPC/firewall settings",
            ],
        )

    def alert_health_summary(self, provider_health: dict[str, bool]):
        """Send periodic health summary of all providers."""
        down = [p for p, ok in provider_health.items() if not ok]
        up = [p for p, ok in provider_health.items() if ok]

        if not down:
            return  # All healthy, no alert needed

        self._send(
            alert_type="health_summary",
            subject=f"📊 Provider Health: {len(down)}/{len(provider_health)} DOWN",
            details=(
                f"UP ({len(up)}): {', '.join(up) or 'none'}\n"
                f"DOWN ({len(down)}): {', '.join(down)}\n"
            ),
            solutions=[
                "IMMEDIATE — The fallback chain handles this automatically.\n"
                "  Users are being served by working providers.",
                "SHORT-TERM — Check and refresh API keys for downed providers.\n"
                f"  Failed: {', '.join(down)}",
                "LONG-TERM — Consider upgrading critical providers to paid tiers\n"
                "  to avoid free-tier rate limits during high-traffic periods.",
            ],
        )

    # ── Internal ────────────────────────────────────────────────────────────
    def _send(
        self,
        alert_type: str,
        subject: str,
        details: str,
        solutions: list[str],
    ):
        """Send alert with cooldown protection."""
        now = time.time()
        if now - _last_alert_time[alert_type] < ALERT_COOLDOWN_SECONDS:
            logger.debug("Alert '%s' suppressed (cooldown)", alert_type)
            return
        _last_alert_time[alert_type] = now

        solutions_text = "\n\n".join(
            f"  {i+1}. {s}" for i, s in enumerate(solutions)
        )

        body = f"""SafeVixAI Production Alert
{'=' * 50}

{subject}

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

DETAILS:
{details}

{'=' * 50}
3 WAYS TO FIX THIS:

{solutions_text}

{'=' * 50}
This alert was sent by SafeVixAI Alert Service.
Cooldown: {ALERT_COOLDOWN_SECONDS}s between same-type alerts.
Configure: ALERT_EMAIL + ALERT_EMAIL_PASSWORD in .env
"""

        # Always log to console
        logger.warning("ALERT [%s]: %s — %s", alert_type, subject, details.split('\n')[0])

        if not self.enabled:
            logger.info("Email not configured. Alert printed to logs only.")
            return

        try:
            msg = MIMEText(body)
            msg["Subject"] = f"[SafeVixAI] {subject}"
            msg["From"] = self.smtp_user
            msg["To"] = self.alert_to

            with smtplib.SMTP("smtp.gmail.com", 587) as s:
                s.starttls()
                s.login(self.smtp_user, self.smtp_pass)
                s.send_message(msg)

            logger.info("Alert email sent to %s", self.alert_to)
        except Exception as e:
            logger.error("Failed to send alert email: %s", e)


# ── Singleton ───────────────────────────────────────────────────────────────
_instance: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    """Get or create the global AlertService singleton."""
    global _instance
    if _instance is None:
        _instance = AlertService()
    return _instance
