
from app.evaluation.dataset import evaluation_questions


def test_evaluation_dataset_is_not_empty():
    assert evaluation_questions


def test_each_question_has_question_and_ground_truth():
    for item in evaluation_questions:
        assert isinstance(item, dict)
        assert isinstance(item.get("question"), str)
        assert item["question"].strip()
        assert isinstance(item.get("ground_truth"), str)
        assert item["ground_truth"].strip()


def test_evaluation_questions_are_unique():
    questions = [
        item["question"].strip().casefold()
        for item in evaluation_questions
    ]

    assert len(questions) == len(set(questions))
