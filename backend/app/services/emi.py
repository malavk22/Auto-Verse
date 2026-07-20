from decimal import Decimal


def calculate_emi(on_road_price: Decimal, down_payment: Decimal,
                   annual_rate: Decimal, tenure_months: int) -> dict:
    loan_amount = on_road_price - down_payment
    monthly_rate = annual_rate / Decimal("1200")

    if monthly_rate == 0:
        emi = loan_amount / tenure_months
    else:
        factor = (Decimal("1") + monthly_rate) ** tenure_months
        emi = loan_amount * monthly_rate * factor / (factor - Decimal("1"))

    total_payment = emi * tenure_months
    total_interest = total_payment - loan_amount

    # Yearly amortization schedule (reducing balance, 12-month blocks)
    schedule = []
    balance = loan_amount
    for year in range(1, ((tenure_months - 1) // 12) + 2):
        months_this_year = min(12, tenure_months - (year - 1) * 12)
        principal_paid = Decimal("0")
        interest_paid = Decimal("0")
        for _ in range(months_this_year):
            interest = balance * monthly_rate
            principal = emi - interest
            balance -= principal
            principal_paid += principal
            interest_paid += interest
        schedule.append({
            "year": year,
            "principal_paid": principal_paid.quantize(Decimal("0.01")),
            "interest_paid": interest_paid.quantize(Decimal("0.01")),
            "balance": max(balance, Decimal("0")).quantize(Decimal("0.01")),
        })

    return {
        "on_road_price": on_road_price,
        "down_payment": down_payment,
        "down_payment_pct": (down_payment / on_road_price * 100).quantize(Decimal("0.1")) if on_road_price else Decimal("0"),
        "loan_amount": loan_amount.quantize(Decimal("0.01")),
        "interest_rate": annual_rate,
        "tenure_months": tenure_months,
        "monthly_emi": emi.quantize(Decimal("0.01")),
        "total_interest": total_interest.quantize(Decimal("0.01")),
        "total_payment": total_payment.quantize(Decimal("0.01")),
        "schedule": schedule,
    }
