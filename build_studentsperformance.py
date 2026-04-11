import json
from pathlib import Path

import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
QUESTIONS_DIR = BASE_DIR / "questions_newtp"

KEY_COLUMNS = ["sid", "qid", "score"]
DIMENSIONS = [
    "abstraction",
    "decomposition",
    "pattern",
    "generalization",
    "algorithm",
    "applying",
    "analyzing",
    "evaluating",
    "creating",
]

OBSERVABILITY_NAME_MAP = {
    "abstraction": "Abstraction",
    "decomposition": "Decomposition",
    "pattern": "Pattern",
    "generalization": "Generalization",
    "algorithm": "Algorithm",
    "applying": "Applying",
    "analyzing": "Analyzing",
    "evaluating": "Evaluating",
    "creating": "Creating",
}

DATASETS = {
    "gpt": (
        BASE_DIR / "completed_dataset_preserve_na_gpt.xlsx",
        BASE_DIR / "studentsperformance_gpt.xlsx",
    ),
    "claud": (
        BASE_DIR / "completed_dataset_preserve_na_claud.xlsx",
        BASE_DIR / "studentsperformance_claud.xlsx",
    ),
    "gemini3": (
        BASE_DIR / "completed_dataset_preserve_na_gemini3.xlsx",
        BASE_DIR / "studentsperformance_gemini3.xlsx",
    ),
}


def get_not_applicable_dimensions(qid: int | float) -> set[str]:
    try:
        qid_int = int(qid)
    except (TypeError, ValueError):
        return set()

    path = QUESTIONS_DIR / str(qid_int) / "observability.json"
    if not path.exists():
        return set()

    with path.open("r", encoding="utf-8") as file:
        observability = json.load(file)

    values = observability.get("not_applicable", [])
    if not isinstance(values, list):
        return set()

    reverse_map = {value: key for key, value in OBSERVABILITY_NAME_MAP.items()}
    return {reverse_map[value] for value in values if value in reverse_map}


def load_completed_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name="completed")
    needed_columns = KEY_COLUMNS + DIMENSIONS
    missing_columns = [column for column in needed_columns if column not in df.columns]
    if missing_columns:
        raise ValueError(f"{path.name} is missing columns: {missing_columns}")

    cleaned_df = df[needed_columns].copy()
    for column in ["score"] + DIMENSIONS:
        cleaned_df[column] = cleaned_df[column].replace(["NA", "na", "N/A", "", " "], pd.NA)
        cleaned_df[column] = pd.to_numeric(cleaned_df[column], errors="coerce")

    return cleaned_df


def mask_not_applicable_scores(df: pd.DataFrame) -> pd.DataFrame:
    result_df = df.copy()
    for qid in result_df["qid"].dropna().unique():
        not_applicable_dimensions = get_not_applicable_dimensions(qid)
        if not not_applicable_dimensions:
            continue

        qid_mask = result_df["qid"] == qid
        for dimension in not_applicable_dimensions:
            result_df.loc[qid_mask, dimension] = pd.NA

    return result_df


def build_studentsperformance(input_path: Path, output_path: Path) -> pd.DataFrame:
    df = load_completed_dataset(input_path)
    df = mask_not_applicable_scores(df)

    aggregation_map = {"score": "sum"}
    for dimension in DIMENSIONS:
        aggregation_map[dimension] = "mean"

    student_df = df.groupby("sid", as_index=False).agg(aggregation_map)
    student_df = student_df.rename(columns={"sid": "sid", "score": "score"})

    # Evaluating is not applicable in the current question set, so drop the all-NA column.
    if "evaluating" in student_df.columns and student_df["evaluating"].isna().all():
        student_df = student_df.drop(columns=["evaluating"])

    student_df = student_df.sort_values("sid").reset_index(drop=True)
    student_df.to_excel(output_path, index=False)
    return student_df


def main(dataset_key: str) -> None:
    if dataset_key not in DATASETS:
        valid_keys = ", ".join(sorted(DATASETS))
        raise ValueError(f"Unknown dataset '{dataset_key}'. Use one of: {valid_keys}")

    input_path, output_path = DATASETS[dataset_key]
    student_df = build_studentsperformance(input_path, output_path)
    print(f"Built {output_path.name} from {input_path.name}")
    print(f"Rows: {len(student_df)} | Students: {student_df['sid'].nunique()}")
    print(student_df.head(5).to_string(index=False))


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        raise SystemExit("Usage: py build_studentsperformance.py [gpt|claud|gemini3]")

    main(sys.argv[1].strip().lower())
