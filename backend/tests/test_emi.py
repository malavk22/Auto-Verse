from decimal import Decimal

from app.services.emi import calculate_emi


def test_zero_interest_splits_loan_evenly_across_tenure():
    result = calculate_emi(
        on_road_price=Decimal("500000"),
        down_payment=Decimal("100000"),
        annual_rate=Decimal("0"),
        tenure_months=10,
    )

    assert result["loan_amount"] == Decimal("400000.00")
    assert result["monthly_emi"] == Decimal("40000.00")
    assert result["total_interest"] == Decimal("0.00")
    assert result["total_payment"] == Decimal("400000.00")
    assert result["down_payment_pct"] == Decimal("20.0")


def test_nonzero_interest_amortizes_to_zero_balance():
    result = calculate_emi(
        on_road_price=Decimal("600000"),
        down_payment=Decimal("0"),
        annual_rate=Decimal("10"),
        tenure_months=12,
    )

    # total_payment/total_interest are internally consistent with the EMI,
    # within a cent of rounding since monthly_emi is quantized independently
    assert abs(result["total_payment"] - result["monthly_emi"] * 12) <= Decimal("0.05")
    assert result["total_interest"] == result["total_payment"] - result["loan_amount"]
    assert result["total_interest"] > 0  # a real loan accrues interest

    # the amortization schedule fully repays the loan and tracks the same interest
    schedule = result["schedule"]
    assert sum(row["principal_paid"] for row in schedule) == result["loan_amount"]
    assert sum(row["interest_paid"] for row in schedule) == result["total_interest"]
    assert schedule[-1]["balance"] == Decimal("0.00")


def test_down_payment_cannot_be_negative_loan():
    # on_road == down_payment means nothing is financed
    result = calculate_emi(
        on_road_price=Decimal("500000"),
        down_payment=Decimal("500000"),
        annual_rate=Decimal("9.5"),
        tenure_months=36,
    )
    assert result["loan_amount"] == Decimal("0.00")
    assert result["monthly_emi"] == Decimal("0.00")
    assert result["total_interest"] == Decimal("0.00")


def test_schedule_spans_correct_number_of_years():
    # 30 months -> 3 partial/full 12-month blocks (year 1, 2, and a 6-month year 3)
    result = calculate_emi(
        on_road_price=Decimal("300000"),
        down_payment=Decimal("0"),
        annual_rate=Decimal("8"),
        tenure_months=30,
    )
    schedule = result["schedule"]
    assert [row["year"] for row in schedule] == [1, 2, 3]
    assert schedule[-1]["balance"] == Decimal("0.00")
