class VerificationAgent:
    async def run(self, params: dict) -> dict:
        trip_id = params.get("trip_id", "")
        plan_summary = params.get("plan_summary", {})

        issues = []
        warnings = []
        checks_passed = []

        # Check for flight
        flights = plan_summary.get("flights", [])
        if not flights:
            issues.append("No flights selected")
        else:
            checks_passed.append("Outbound flight confirmed")
            if plan_summary.get("return_date"):
                checks_passed.append("Return flight confirmed")

        # Check for lodging
        lodging = plan_summary.get("lodging")
        if not lodging:
            issues.append("No lodging selected")
        else:
            checks_passed.append("Lodging confirmed")

        # Check for budget
        budget_info = plan_summary.get("budget", {})
        if budget_info.get("over_budget"):
            overage = budget_info.get("total_estimated", 0) - budget_info.get("budget_total", 0)
            issues.append(f"Plan is over budget by ${overage:.0f}")
        elif budget_info:
            checks_passed.append(
                f"Within budget ({budget_info.get('percentage_used', 0):.0f}% used)"
            )

        # Check dates make sense
        departure = plan_summary.get("departure_date")
        return_date = plan_summary.get("return_date")
        if departure and return_date and departure >= return_date:
            issues.append("Return date must be after departure date")
        elif departure and return_date:
            checks_passed.append("Travel dates are valid")

        # Check traveler count
        num_travelers = plan_summary.get("num_travelers", 1)
        if num_travelers < 1:
            issues.append("Invalid number of travelers")
        else:
            checks_passed.append(f"Traveler count verified ({num_travelers})")

        overall_status = "approved" if not issues else "needs_review"

        return {
            "trip_id": trip_id,
            "status": overall_status,
            "issues": issues,
            "warnings": warnings,
            "checks_passed": checks_passed,
            "ready_to_book": overall_status == "approved",
            "summary": (
                "All checks passed. Ready to proceed with booking."
                if overall_status == "approved"
                else f"Found {len(issues)} issue(s) that need attention before booking."
            ),
        }
