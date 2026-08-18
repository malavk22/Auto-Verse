from app.services.body_type import BODY_TYPES, MODEL_BODY_TYPE, body_type_of, models_for_body_type


def test_every_mapped_model_has_a_valid_body_type():
    for model, body_type in MODEL_BODY_TYPE.items():
        assert body_type in BODY_TYPES, f"{model!r} mapped to unknown body type {body_type!r}"


def test_body_type_of_returns_none_for_unknown_model():
    assert body_type_of("Some Future Model Not Yet Added") is None


def test_models_for_body_type_round_trips():
    for body_type in BODY_TYPES:
        models = models_for_body_type(body_type)
        assert models, f"no models classified as {body_type!r}"
        assert all(MODEL_BODY_TYPE[m] == body_type for m in models)
