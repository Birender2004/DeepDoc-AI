from app.database.database import SessionLocal
from app.database.knowledge_base_repository import (
    create_knowledge_base,
    get_knowledge_base,
    get_knowledge_base_by_name,
    list_knowledge_bases,
)


def main():
    db = SessionLocal()

    first = create_knowledge_base(
        db,
        "Test Knowledge Base A",
    )

    second = create_knowledge_base(
        db,
        "Test Knowledge Base B",
    )

    print(
        "Created:",
        first.id,
        first.name,
    )

    print(
        "Created:",
        second.id,
        second.name,
    )

    retrieved = get_knowledge_base(
        db,
        first.id,
    )

    print(
        "Retrieved by ID:",
        retrieved.name,
    )

    retrieved = get_knowledge_base_by_name(
        db,
        "Test Knowledge Base B",
    )

    print(
        "Retrieved by name:",
        retrieved.name,
    )

    knowledge_bases = list_knowledge_bases(db)

    print("\nAll Knowledge Bases:")

    for knowledge_base in knowledge_bases:
        print(
            knowledge_base.id,
            knowledge_base.name,
        )

    try:
        create_knowledge_base(
            db,
            "Test Knowledge Base A",
        )
    except ValueError as error:
        print(
            "\nDuplicate protection:",
            error,
        )

    db.close()


if __name__ == "__main__":
    main()