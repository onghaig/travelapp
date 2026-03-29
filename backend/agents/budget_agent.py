class BudgetAgent:
    async def run(self, params: dict) -> dict:
        budget_total = params.get("budget_total", 0)
        items = params.get("items", [])

        breakdown: dict = {}
        total_estimated = 0.0

        for item in items:
            category = item.get("category", "misc")
            cost = item.get("cost", 0)
            label = item.get("label", category)

            if category not in breakdown:
                breakdown[category] = {"total": 0.0, "items": []}

            breakdown[category]["total"] += cost
            breakdown[category]["items"].append({"label": label, "cost": cost})
            total_estimated += cost

        remaining = budget_total - total_estimated
        over_budget = total_estimated > budget_total
        percentage_used = (total_estimated / budget_total * 100) if budget_total > 0 else 0

        warnings = []
        if over_budget:
            overage = total_estimated - budget_total
            warnings.append(
                f"Over budget by ${overage:.0f}. Consider reducing costs in: "
                + ", ".join(
                    k
                    for k, v in breakdown.items()
                    if v["total"] > budget_total * 0.4
                )
            )
        elif percentage_used > 85:
            warnings.append(
                f"Using {percentage_used:.0f}% of budget. Little room for unexpected expenses."
            )

        return {
            "budget_total": budget_total,
            "total_estimated": round(total_estimated, 2),
            "remaining": round(remaining, 2),
            "over_budget": over_budget,
            "percentage_used": round(percentage_used, 1),
            "breakdown": breakdown,
            "warnings": warnings,
        }
