from app.evaluation.dataset import evaluation_questions


print("Evaluation dataset loaded.")

print(f"Number of questions: {len(evaluation_questions)}")

for index, item in enumerate(
    evaluation_questions,
    start=1,
):
    print(f"\nQuestion {index}:")
    print(item["question"])

    print("Ground Truth:")
    print(item["ground_truth"])