"""Offline synthetic contract checks; none of these records are observations."""

import datetime
import json
import unittest

from normalize import normalize


class NormalizationTests(unittest.TestCase):
    def setUp(self):
        self.observation = datetime.datetime(2026, 11, 14, 12, 0, tzinfo=datetime.timezone.utc)
        self.person = {
            "identity_match": True, "target_company_domain": "example.com",
            "is_current": "yes", "current_title": "Director of Ecommerce",
            "current_company_domain": "example.com", "linkedin_url": None,
            "source_url": "https://example.com/team", "source_opened": True,
            "source_excerpt": "Example Person, Director of Ecommerce.",
            "source_published_at": "2026-10-01", "conflict": False, "uncertainty": None,
        }
        self.company = {
            "domain": "example.com", "headcount": 12, "headcount_type": "exact",
            "source_url": "https://example.com/about", "source_opened": True,
            "source_excerpt": "Our company employs 12 people.",
            "source_published_at": None, "conflict": False, "uncertainty": None,
        }

    def result(self, **changes):
        inputs = {
            "domain": "example.com", "name": "Synthetic Example Person",
            "title": "Director of E-commerce", "linkedin_url": "",
            "research_json": json.dumps({"person": self.person, "company": self.company}),
        }
        inputs.update(changes)
        return normalize(inputs, self.observation)["facts"]

    def test_research_pass_still_requires_review_and_has_no_verification_receipt(self):
        facts = self.result()
        self.assertEqual(facts["outcome"], "pass")
        self.assertTrue(facts["requires_human_review"])
        self.assertIsNone(facts["evidence"]["verification_receipt"])
        self.assertEqual(facts["evidence"]["person"]["source_published_at"], "2026-10-01")
        self.assertEqual(facts["person"]["observed_at"], "2026-11-14")
        self.assertNotIn("id", facts)
        self.assertNotIn("run_id", facts)
        self.assertNotIn("completed_at", facts)

    def test_unopened_or_private_source_cannot_support_current_role(self):
        for source in ("http://example.com/team", "https://127.0.0.1/team", "https://user:secret@example.com/team", "https://intranet.local/team"):
            self.person["source_url"] = source
            self.assertEqual(self.result()["person"]["is_current"], "unclear")
        self.person["source_url"] = "https://example.com/team"
        self.person["source_opened"] = False
        self.assertEqual(self.result()["outcome"], "hold")

    def test_source_for_wrong_person_or_company_is_held(self):
        self.person["identity_match"] = False
        self.assertEqual(self.result()["outcome"], "hold")
        self.person["identity_match"] = True
        self.person["target_company_domain"] = "different.example.com"
        self.assertEqual(self.result()["person"]["is_current"], "unclear")

    def test_partial_roster_range_boolean_or_unquoted_number_is_not_headcount(self):
        for count, kind, quote in ((12, "range", "11-50 employees"), (12, "partial_roster", "12 profiles"), (True, "exact", "1 employee"), (12, "exact", "Our team")):
            self.company.update(headcount=count, headcount_type=kind, source_excerpt=quote)
            facts = self.result()
            self.assertIsNone(facts["company"]["headcount"])
            self.assertIn("HOLD_LEGIT_UNKNOWN", facts["reason_codes"])

    def test_conflicting_title_or_source_does_not_pass(self):
        self.person["current_title"] = "VP Marketing"
        self.assertIn("HOLD_PROVIDER_CONFLICT", self.result()["reason_codes"])
        self.person.update(current_title="Director of Ecommerce", conflict=True)
        self.assertEqual(self.result()["outcome"], "hold")

    def test_supported_departure_is_excluded_but_conflict_is_held(self):
        self.person.update(is_current="no", current_company_domain="different.com", source_excerpt="Example Person left Example for Different.")
        self.assertEqual(self.result()["reason_codes"], ["EXCLUDE_LEFT_COMPANY"])
        self.person["conflict"] = True
        self.assertEqual(self.result()["outcome"], "hold")

    def test_founder_needs_known_team_under_twenty(self):
        self.person["current_title"] = "Founder"
        self.assertEqual(self.result(title="Founder")["outcome"], "pass")
        self.company.update(headcount=20, source_excerpt="Our company employs 20 people.")
        self.assertEqual(self.result(title="Founder")["outcome"], "hold")

    def test_missing_identity_bad_json_and_model_metadata_fail_closed(self):
        self.assertEqual(self.result(name="")["reason_codes"], ["FAIL_INPUT_MISSING"])
        self.assertEqual(self.result(name="", linkedin_url="https://example.com/")["reason_codes"], ["FAIL_INPUT_MISSING"])
        self.assertEqual(self.result(research_json="not json")["reason_codes"], ["FAIL_PROVIDER_ERROR"])
        self.person["observed_at"] = "2020-01-01"
        self.person["source_published_at"] = "2099-01-01"
        facts = self.result()
        self.assertEqual(facts["person"]["observed_at"], "2026-11-14")
        self.assertIsNone(facts["evidence"]["person"]["source_published_at"])

    def test_profile_conflicts_and_stated_uncertainty_require_review(self):
        self.person["linkedin_url"] = "https://www.linkedin.com/in/different-synthetic-profile"
        self.assertIn("HOLD_PROVIDER_CONFLICT", self.result(linkedin_url="https://www.linkedin.com/in/supplied-synthetic-profile")["reason_codes"])
        self.person["uncertainty"] = "Two people share this name."
        self.assertEqual(self.result()["outcome"], "hold")


if __name__ == "__main__":
    unittest.main()
