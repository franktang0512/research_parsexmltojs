import json
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
QUESTIONS_DIR = BASE_DIR / "questions_newtp"
RATER_FILES = {
    "claud": BASE_DIR / "completed_dataset_preserve_na_claud.xlsx",
    "gemini3": BASE_DIR / "completed_dataset_preserve_na_gemini3.xlsx",
    "gpt": BASE_DIR / "completed_dataset_preserve_na_gpt.xlsx",
}
OUTPUT_FILE = BASE_DIR / "multi_rater_correlation_results.xlsx"

KEY_COLUMNS = ["sid", "qid"]
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


def load_rating_sheet(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name="completed")
    needed_columns = KEY_COLUMNS + DIMENSIONS
    missing_columns = [column for column in needed_columns if column not in df.columns]
    if missing_columns:
        raise ValueError(f"{path.name} is missing columns: {missing_columns}")

    cleaned_df = df[needed_columns].copy()
    for dimension in DIMENSIONS:
        cleaned_df[dimension] = cleaned_df[dimension].replace(["NA", "na", "N/A", "", " "], pd.NA)
        cleaned_df[dimension] = pd.to_numeric(cleaned_df[dimension], errors="coerce")

    return cleaned_df


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
        values = []

    reverse_map = {value: key for key, value in OBSERVABILITY_NAME_MAP.items()}
    return {reverse_map[value] for value in values if value in reverse_map}


def build_pair_dataframe(left_name: str, left_df: pd.DataFrame, right_name: str, right_df: pd.DataFrame) -> pd.DataFrame:
    merged_df = left_df.merge(
        right_df,
        on=KEY_COLUMNS,
        how="inner",
        suffixes=(f"_{left_name}", f"_{right_name}"),
    )
    if merged_df.empty:
        raise ValueError(f"No matched rows were found for {left_name} vs {right_name}.")
    return merged_df


def build_all_raters_dataframe(loaded_dfs: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rater_names = sorted(loaded_dfs.keys())
    merged_df = loaded_dfs[rater_names[0]].copy()
    merged_df = merged_df.rename(columns={dimension: f"{dimension}_{rater_names[0]}" for dimension in DIMENSIONS})

    for rater_name in rater_names[1:]:
        next_df = loaded_dfs[rater_name].copy()
        next_df = next_df.rename(columns={dimension: f"{dimension}_{rater_name}" for dimension in DIMENSIONS})
        merged_df = merged_df.merge(next_df, on=KEY_COLUMNS, how="inner")

    if merged_df.empty:
        raise ValueError("No matched rows were found across all three raters.")

    return merged_df


def calculate_pair_results(merged_df: pd.DataFrame, left_name: str, right_name: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    detail_rows = []
    summary_rows = []

    for qid in sorted(merged_df["qid"].dropna().unique()):
        question_df = merged_df[merged_df["qid"] == qid].copy()
        not_applicable_dimensions = get_not_applicable_dimensions(qid)

        summary = {
            "qid": qid,
            "pair": f"{left_name}_vs_{right_name}",
            "total_matched_students": len(question_df),
        }

        for dimension in DIMENSIONS:
            left_col = f"{dimension}_{left_name}"
            right_col = f"{dimension}_{right_name}"

            left_non_null = int(question_df[left_col].notna().sum())
            right_non_null = int(question_df[right_col].notna().sum())
            pair_df = question_df[[left_col, right_col]].dropna()
            score_score_count = len(pair_df)
            left_score_right_na_count = int((question_df[left_col].notna() & question_df[right_col].isna()).sum())
            left_na_right_score_count = int((question_df[left_col].isna() & question_df[right_col].notna()).sum())
            na_na_count = int((question_df[left_col].isna() & question_df[right_col].isna()).sum())

            if dimension in not_applicable_dimensions:
                pearson_correlation = None
                spearman_correlation = None
                status = "not_applicable_by_observability"
            elif pair_df.empty:
                pearson_correlation = None
                spearman_correlation = None
                status = "all_missing_after_match"
            elif score_score_count < 2:
                pearson_correlation = None
                spearman_correlation = None
                status = "insufficient_pairs"
            elif pair_df[left_col].nunique() == 1 or pair_df[right_col].nunique() == 1:
                pearson_correlation = None
                spearman_correlation = None
                status = "constant_values"
            else:
                pearson_correlation = pair_df[left_col].corr(pair_df[right_col], method="pearson")
                spearman_correlation = pair_df[left_col].corr(pair_df[right_col], method="spearman")
                status = "ok"

            detail_rows.append(
                {
                    "pair": f"{left_name}_vs_{right_name}",
                    "qid": qid,
                    "dimension": dimension,
                    f"{left_name}_non_null": left_non_null,
                    f"{right_name}_non_null": right_non_null,
                    "score_score_count": score_score_count,
                    f"{left_name}_score_{right_name}_na_count": left_score_right_na_count,
                    f"{left_name}_na_{right_name}_score_count": left_na_right_score_count,
                    "na_na_count": na_na_count,
                    "status": status,
                    "pearson_correlation": pearson_correlation,
                    "spearman_correlation": spearman_correlation,
                }
            )

            summary[f"{dimension}_pearson"] = pearson_correlation
            summary[f"{dimension}_spearman"] = spearman_correlation
            summary[f"{dimension}_score_score_count"] = score_score_count
            summary[f"{dimension}_{left_name}_score_{right_name}_na_count"] = left_score_right_na_count
            summary[f"{dimension}_{left_name}_na_{right_name}_score_count"] = left_na_right_score_count
            summary[f"{dimension}_na_na_count"] = na_na_count
            summary[f"{dimension}_status"] = status

        summary_rows.append(summary)

    return pd.DataFrame(detail_rows), pd.DataFrame(summary_rows)


def build_compact_correlation_sheet(all_detail_df: pd.DataFrame, method: str) -> pd.DataFrame:
    rows = []
    for pair_name in sorted(all_detail_df["pair"].unique()):
        pair_detail_df = all_detail_df[all_detail_df["pair"] == pair_name]
        pivot_df = pair_detail_df.pivot(index="qid", columns="dimension", values=f"{method}_correlation")
        pivot_df = pivot_df.reindex(columns=DIMENSIONS).reset_index()
        pivot_df.insert(1, "pair", pair_name)
        rows.append(pivot_df)

    return pd.concat(rows, ignore_index=True)


def build_multi_rater_long_df(all_raters_df: pd.DataFrame) -> pd.DataFrame:
    long_rows = []
    rater_names = sorted(RATER_FILES.keys())

    for _, row in all_raters_df.iterrows():
        qid = row["qid"]
        not_applicable_dimensions = get_not_applicable_dimensions(qid)

        for dimension in DIMENSIONS:
            status = "not_applicable_by_observability" if dimension in not_applicable_dimensions else "ok"
            rater_scores = {f"{rater_name}_score": row[f"{dimension}_{rater_name}"] for rater_name in rater_names}
            valid_scores = [score for score in rater_scores.values() if pd.notna(score)]
            unique_valid_scores = set(valid_scores)

            long_rows.append(
                {
                    "sid": row["sid"],
                    "qid": qid,
                    "dimension": dimension,
                    "status": status,
                    **rater_scores,
                    "non_missing_rater_count": len(valid_scores),
                    "complete_case_count": int(len(valid_scores) == len(rater_names)),
                    "exact_all_three_agree": int(len(valid_scores) == len(rater_names) and len(unique_valid_scores) == 1),
                    "at_least_two_agree": int(len(valid_scores) >= 2 and len(unique_valid_scores) < len(valid_scores)),
                }
            )

    long_df = pd.DataFrame(long_rows)
    return long_df


def calculate_icc_a1(score_df: pd.DataFrame) -> float | None:
    matrix = score_df.to_numpy(dtype=float)
    n_targets, n_raters = matrix.shape

    if n_targets < 2 or n_raters < 2:
        return None

    row_means = matrix.mean(axis=1)
    col_means = matrix.mean(axis=0)
    grand_mean = matrix.mean()

    msr_numerator = n_raters * np.sum((row_means - grand_mean) ** 2)
    msc_numerator = n_targets * np.sum((col_means - grand_mean) ** 2)
    mse_numerator = np.sum((matrix - row_means[:, None] - col_means[None, :] + grand_mean) ** 2)

    msr = msr_numerator / (n_targets - 1)
    msc = msc_numerator / (n_raters - 1)
    mse = mse_numerator / ((n_targets - 1) * (n_raters - 1))

    denominator = msr + (n_raters - 1) * mse + (n_raters * (msc - mse) / n_targets)
    if denominator == 0:
        return None

    return float((msr - mse) / denominator)


def calculate_fleiss_kappa(score_df: pd.DataFrame) -> float | None:
    categories = sorted(pd.unique(score_df.to_numpy().ravel()))
    if len(categories) < 2:
        return None

    count_rows = []
    for _, row in score_df.iterrows():
        counts = [(row == category).sum() for category in categories]
        count_rows.append(counts)

    count_matrix = np.array(count_rows, dtype=float)
    n_targets, _ = count_matrix.shape
    n_raters = int(count_matrix.sum(axis=1)[0])

    if n_targets < 2 or n_raters < 2:
        return None

    agreement_per_target = (np.sum(count_matrix**2, axis=1) - n_raters) / (n_raters * (n_raters - 1))
    p_bar = agreement_per_target.mean()
    p_j = count_matrix.sum(axis=0) / (n_targets * n_raters)
    p_e_bar = np.sum(p_j**2)

    if p_e_bar == 1:
        return None

    return float((p_bar - p_e_bar) / (1 - p_e_bar))


def summarize_multi_rater_group(group_df: pd.DataFrame, group_type: str, qid: int | None, dimension: str | None) -> dict[str, object]:
    score_columns = [f"{rater_name}_score" for rater_name in sorted(RATER_FILES.keys())]
    valid_group_df = group_df[group_df["status"] == "ok"].copy()
    complete_cases_df = valid_group_df.dropna(subset=score_columns)
    two_plus_df = valid_group_df[valid_group_df["non_missing_rater_count"] >= 2]

    summary = {
        "group_type": group_type,
        "qid": qid,
        "dimension": dimension,
        "valid_rows": len(valid_group_df),
        "complete_case_rows": len(complete_cases_df),
        "rows_with_2plus_ratings": len(two_plus_df),
        "icc_a1_two_way_random_absolute": None,
        "fleiss_kappa": None,
        "exact_all_three_agreement_count": None,
        "exact_all_three_agreement_pct": None,
        "at_least_two_agree_count": None,
        "at_least_two_agree_pct": None,
        "status": "ok",
    }

    if valid_group_df.empty:
        summary["status"] = "no_valid_rows"
        return summary

    if len(complete_cases_df) >= 2:
        score_df = complete_cases_df[score_columns]
        summary["icc_a1_two_way_random_absolute"] = calculate_icc_a1(score_df)
        summary["fleiss_kappa"] = calculate_fleiss_kappa(score_df)
        summary["exact_all_three_agreement_count"] = int(complete_cases_df["exact_all_three_agree"].sum())
        summary["exact_all_three_agreement_pct"] = float(complete_cases_df["exact_all_three_agree"].mean() * 100)
    else:
        summary["status"] = "insufficient_complete_cases"

    if len(two_plus_df) > 0:
        summary["at_least_two_agree_count"] = int(two_plus_df["at_least_two_agree"].sum())
        summary["at_least_two_agree_pct"] = float(two_plus_df["at_least_two_agree"].mean() * 100)
    else:
        summary["status"] = "insufficient_2plus_rows"

    return summary


def build_multi_rater_summary_sheets(long_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    summary_rows = []

    summary_rows.append(summarize_multi_rater_group(long_df, "overall", None, None))

    for qid in sorted(long_df["qid"].dropna().unique()):
        summary_rows.append(summarize_multi_rater_group(long_df[long_df["qid"] == qid], "by_qid", int(qid), None))

    for dimension in DIMENSIONS:
        summary_rows.append(
            summarize_multi_rater_group(long_df[long_df["dimension"] == dimension], "by_dimension", None, dimension)
        )

    for qid in sorted(long_df["qid"].dropna().unique()):
        for dimension in DIMENSIONS:
            group_df = long_df[(long_df["qid"] == qid) & (long_df["dimension"] == dimension)]
            summary_rows.append(summarize_multi_rater_group(group_df, "by_qid_dimension", int(qid), dimension))

    summary_df = pd.DataFrame(summary_rows)
    icc_df = summary_df[
        ["group_type", "qid", "dimension", "valid_rows", "complete_case_rows", "icc_a1_two_way_random_absolute", "status"]
    ].copy()
    fleiss_df = summary_df[
        ["group_type", "qid", "dimension", "valid_rows", "complete_case_rows", "fleiss_kappa", "status"]
    ].copy()
    agreement_df = summary_df[
        [
            "group_type",
            "qid",
            "dimension",
            "valid_rows",
            "complete_case_rows",
            "rows_with_2plus_ratings",
            "exact_all_three_agreement_count",
            "exact_all_three_agreement_pct",
            "at_least_two_agree_count",
            "at_least_two_agree_pct",
            "status",
        ]
    ].copy()

    return summary_df, icc_df, fleiss_df, agreement_df


def print_pair_results(pair_name: str, detail_df: pd.DataFrame) -> None:
    pd.set_option("display.width", 200)
    pd.set_option("display.max_columns", None)
    pd.set_option("display.float_format", lambda value: f"{value:.4f}")

    print(f"{pair_name} | Pearson correlation")
    print(detail_df.pivot(index="qid", columns="dimension", values="pearson_correlation").to_string())
    print()


def save_results(pair_results: dict[str, dict[str, pd.DataFrame]], all_raters_df: pd.DataFrame) -> None:
    all_detail_df = pd.concat([result["detail"] for result in pair_results.values()], ignore_index=True)
    all_summary_df = pd.concat([result["summary"] for result in pair_results.values()], ignore_index=True)
    pearson_compact_df = build_compact_correlation_sheet(all_detail_df, "pearson")
    spearman_compact_df = build_compact_correlation_sheet(all_detail_df, "spearman")
    multi_rater_long_df = build_multi_rater_long_df(all_raters_df)
    multi_rater_summary_df, icc_df, fleiss_df, agreement_df = build_multi_rater_summary_sheets(multi_rater_long_df)

    with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:
        pearson_compact_df.to_excel(writer, sheet_name="pearson_compact", index=False)
        spearman_compact_df.to_excel(writer, sheet_name="spearman_compact", index=False)
        all_summary_df.to_excel(writer, sheet_name="summary", index=False)
        all_detail_df.to_excel(writer, sheet_name="detail", index=False)
        multi_rater_long_df.to_excel(writer, sheet_name="multi_rater_long", index=False)
        multi_rater_summary_df.to_excel(writer, sheet_name="multi_rater_summary", index=False)
        icc_df.to_excel(writer, sheet_name="icc_summary", index=False)
        fleiss_df.to_excel(writer, sheet_name="fleiss_kappa_summary", index=False)
        agreement_df.to_excel(writer, sheet_name="agreement_summary", index=False)

        for pair_name, result in pair_results.items():
            result["matched"].to_excel(writer, sheet_name=f"{pair_name}_matched", index=False)


def main() -> None:
    loaded_dfs = {name: load_rating_sheet(path) for name, path in RATER_FILES.items()}
    all_raters_df = build_all_raters_dataframe(loaded_dfs)
    pair_results = {}

    for left_name, right_name in combinations(sorted(loaded_dfs.keys()), 2):
        pair_name = f"{left_name}_vs_{right_name}"
        merged_df = build_pair_dataframe(left_name, loaded_dfs[left_name], right_name, loaded_dfs[right_name])
        detail_df, summary_df = calculate_pair_results(merged_df, left_name, right_name)
        pair_results[pair_name] = {
            "matched": merged_df,
            "detail": detail_df,
            "summary": summary_df,
        }
        print_pair_results(pair_name, detail_df)

    save_results(pair_results, all_raters_df)
    print(f"Saved results to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
