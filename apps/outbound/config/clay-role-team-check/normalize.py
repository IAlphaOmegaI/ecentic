"""Clay code node: validate public-research output without asserting a receipt.

No network, filesystem, model calls, external writes or provider verification.
The injected workflow clock dates this research observation, not the source's
publication, an email verification, or a provider's last profile refresh.
"""

import datetime
import ipaddress
import json
import re
from urllib.parse import urlsplit


def text(value, maximum=2000):
    return value.strip()[:maximum] if isinstance(value, str) else None


def domain(value):
    candidate = text(value, 253)
    if not candidate or candidate != candidate.lower() or ":" in candidate:
        return None
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", candidate):
        return None
    labels = candidate.split(".")
    if len(labels) < 2 or any(not label or len(label) > 63 for label in labels):
        return None
    if any(label.startswith("-") or label.endswith("-") for label in labels):
        return None
    if labels[-1] in {"localhost", "local", "internal", "test", "invalid"}:
        return None
    try:
        ipaddress.ip_address(candidate)
        return None
    except ValueError:
        return candidate.removeprefix("www.")


def public_url(value):
    candidate = text(value)
    if not candidate:
        return None
    try:
        parsed = urlsplit(candidate)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port:
            return None
        return candidate if domain(parsed.hostname) else None
    except ValueError:
        return None


def linkedin_profile(value):
    candidate = public_url(value)
    if not candidate:
        return None
    profile = urlsplit(candidate)
    if profile.hostname not in {"linkedin.com", "www.linkedin.com"} or not profile.path.startswith("/in/") or len(profile.path.removeprefix("/in/").strip("/")) < 1:
        return None
    return "https://www.linkedin.com" + profile.path.rstrip("/")


def published_date(value, today):
    candidate = text(value, 10)
    if not candidate:
        return None
    try:
        parsed = datetime.date.fromisoformat(candidate)
        return candidate if parsed <= today else None
    except ValueError:
        return None


def normalized_title(value):
    title = (text(value) or "").lower()
    title = re.sub(r"e[ -]?commerce", "ecommerce", title)
    title = re.sub(r"\bvice president\b", "vp", title)
    title = re.sub(r"\bchief marketing officer\b", "cmo", title)
    title = re.sub(r"\bchief executive officer\b", "ceo", title)
    title = re.sub(r"\bof\b", " ", title)
    return " ".join(re.findall(r"[a-z0-9]+", title))


def role(value, headcount):
    title = normalized_title(value)
    if not title:
        return "unclear", None
    if re.search(r"\b(assistant|intern|advisor|adviser|consultant|recruiter|influencer|affiliate|sales)\b", title):
        return "unclear", "other"
    if re.search(r"\b(founder|ceo)\b", title):
        return ("match" if headcount is not None and headcount < 20 else "unclear"), "founder"
    senior = bool(re.search(r"\b(head|director|vp)\b", title))
    if "ecommerce" in title:
        return ("match" if senior else "mismatch"), "ecommerce"
    if "digital" in title:
        return ("match" if re.search(r"\b(director|vp)\b", title) else "unclear"), "digital"
    if "growth" in title:
        return ("match" if re.search(r"\bhead\b", title) else "unclear"), "growth"
    if "marketing" in title or re.search(r"\bcmo\b", title):
        return ("match" if re.search(r"\b(vp|director|manager|cmo)\b", title) else "unclear"), "marketing"
    return "mismatch", "other"


def failure(reason, message):
    return {"facts": {
        "routine": "ecentic_role_team_check", "routine_version": "1",
        "item_status": "failed", "outcome": None, "reason_codes": [reason],
        "person": {
            "is_current": "unclear", "current_title": None,
            "current_company_domain": None, "role_match": "unclear",
            "role_category": None, "linkedin_url": None,
            "source_provider": "Clay web research", "source_url": None,
            "observed_at": None, "uncertainty": message,
        },
        "company": {
            "headcount": None, "headcount_source": None,
            "headcount_observed_at": None, "business_type": "unknown",
            "business_type_evidence_url": None, "hq_country": None,
        },
        "suggested": {"personal_line": None},
        "evidence": {"kind": "public_source_research", "observation_clock": "workflow_runtime", "verification_receipt": None},
        "scope": "role_and_team_only", "requires_human_review": True,
    }}


def normalize(inputs, observation):
    target = domain(inputs.get("domain"))
    name = text(inputs.get("name"))
    linkedin = linkedin_profile(inputs.get("linkedin_url"))
    title = text(inputs.get("title"))
    if not target or not title or not (name or linkedin):
        return failure("FAIL_INPUT_MISSING", "A store domain, Apollo title and contact name or profile are required.")
    raw = inputs.get("research_json")
    if not isinstance(raw, str) or len(raw) > 50000:
        return failure("FAIL_PROVIDER_ERROR", "Research returned no bounded JSON object.")
    try:
        research = json.loads(raw)
    except (ValueError, TypeError):
        return failure("FAIL_PROVIDER_ERROR", "Research returned invalid JSON.")
    if not isinstance(research, dict) or not isinstance(research.get("person"), dict) or not isinstance(research.get("company"), dict):
        return failure("FAIL_PROVIDER_ERROR", "Research is missing the person or company evidence.")

    person = research["person"]
    company = research["company"]
    observed = observation.astimezone(datetime.timezone.utc).date()
    timestamp = observation.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    person_url = public_url(person.get("source_url"))
    company_url = public_url(company.get("source_url"))
    person_excerpt = text(person.get("source_excerpt"))
    company_excerpt = text(company.get("source_excerpt"))
    person_uncertainty = text(person.get("uncertainty"))
    company_uncertainty = text(company.get("uncertainty"))
    researched_linkedin = linkedin_profile(person.get("linkedin_url"))
    person_supported = bool(
        person.get("source_opened") is True and person.get("identity_match") is True
        and domain(person.get("target_company_domain")) == target
        and person_url and person_excerpt
    )
    company_supported = bool(
        company.get("source_opened") is True and domain(company.get("domain")) == target
        and company_url and company_excerpt
    )
    current = person.get("is_current") if person_supported else "unclear"
    current = current if current in {"yes", "no", "unclear"} else "unclear"
    employer = domain(person.get("current_company_domain")) if person_supported else None
    current_title = text(person.get("current_title")) if person_supported else None
    if current == "yes" and (employer != target or not current_title):
        current = "unclear"

    reported_count = company.get("headcount")
    count_supported = bool(
        company_supported and company.get("headcount_type") == "exact"
        and type(reported_count) is int and 0 < reported_count <= 10000000
        and re.search(r"(?<!\d)" + str(reported_count) + r"(?!\d)", (company_excerpt or "").replace(",", ""))
    )
    headcount = reported_count if count_supported else None
    matching, category = role(current_title, headcount)
    conflict = (
        person.get("conflict") is True or company.get("conflict") is True
        or (current == "yes" and normalized_title(current_title) != normalized_title(title))
        or (linkedin is not None and researched_linkedin is not None and linkedin != researched_linkedin)
    )
    reasons = []
    if conflict:
        reasons.append("HOLD_PROVIDER_CONFLICT")
    if current == "unclear" or person_uncertainty:
        reasons.append("HOLD_ROLE_UNCLEAR")
    if current == "yes" and matching != "match":
        reasons.append("HOLD_ROLE_MISMATCH" if matching == "mismatch" else "HOLD_ROLE_UNCLEAR")
    if headcount is None or headcount < 3 or company_uncertainty:
        reasons.append("HOLD_LEGIT_UNKNOWN")
    if current == "no" and not conflict and not person_uncertainty:
        outcome, reasons = "exclude", ["EXCLUDE_LEFT_COMPANY"]
    elif reasons:
        outcome = "hold"
    else:
        outcome, reasons = "pass", ["PASS"]

    uncertainty = person_uncertainty
    if conflict:
        uncertainty = "Current evidence conflicts with another source or Apollo; review both before changing the contact."
    elif not person_supported:
        uncertainty = uncertainty or "No opened public source establishes this exact person and target company."
    confirmed_linkedin = researched_linkedin if person_supported else None

    return {"facts": {
        "routine": "ecentic_role_team_check", "routine_version": "1",
        "item_status": "completed" if person_supported and count_supported else "partial",
        "outcome": outcome, "reason_codes": list(dict.fromkeys(reasons)),
        "person": {
            "is_current": current, "current_title": current_title,
            "current_company_domain": employer, "role_match": matching,
            "role_category": category, "linkedin_url": confirmed_linkedin,
            "source_provider": "Clay web research", "source_url": person_url if person_supported else None,
            "observed_at": observed.isoformat() if person_supported else None,
            "uncertainty": uncertainty,
        },
        "company": {
            "headcount": headcount,
            "headcount_source": "Clay web research, " + company_url if count_supported else None,
            "headcount_observed_at": observed.isoformat() if count_supported else None,
            "business_type": "unknown", "business_type_evidence_url": None, "hq_country": None,
        },
        "suggested": {"personal_line": None},
        "evidence": {
            "kind": "public_source_research", "observation_clock": "workflow_runtime",
            "research_observed_at": timestamp, "verification_receipt": None,
            "person": {
                "source_opened_reported": person.get("source_opened") is True,
                "excerpt": person_excerpt if person_supported else None,
                "source_published_at": published_date(person.get("source_published_at"), observed),
            },
            "company": {
                "source_opened_reported": company.get("source_opened") is True,
                "excerpt": company_excerpt if company_supported else None,
                "source_published_at": published_date(company.get("source_published_at"), observed),
                "uncertainty": company_uncertainty,
                "reported_headcount_type": text(company.get("headcount_type"), 30),
            },
        },
        "scope": "role_and_team_only", "requires_human_review": True,
    }}


def handler(context):
    inputs = {key: context.get_input(key) for key in ("domain", "name", "linkedin_url", "title", "research_json")}
    return normalize(inputs, datetime.datetime.now(datetime.timezone.utc))
