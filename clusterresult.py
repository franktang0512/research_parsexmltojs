from pathlib import Path
from io import BytesIO
import sys

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import win32clipboard
from PIL import Image
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATASET_FILES = {
    "gpt": BASE_DIR / "studentsperformance_gpt.xlsx",
    "claud": BASE_DIR / "studentsperformance_claud.xlsx",
    "gemini3": BASE_DIR / "studentsperformance_gemini3.xlsx",
}

# =========================
# Clustering settings
# =========================
DEFAULT_MODE = "m"
DEFAULT_MANUAL_K = 6
DEFAULT_K_RANGE = range(2, 7)


def copy_figure_to_clipboard(fig: plt.Figure) -> None:
    buffer = BytesIO()
    fig.savefig(buffer, format="png", dpi=300, bbox_inches="tight")
    buffer.seek(0)

    image = Image.open(buffer).convert("RGB")
    bmp_buffer = BytesIO()
    image.save(bmp_buffer, format="BMP")
    dib_data = bmp_buffer.getvalue()[14:]

    win32clipboard.OpenClipboard()
    try:
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32clipboard.CF_DIB, dib_data)
    finally:
        win32clipboard.CloseClipboard()


def add_copy_toolbar_button(fig: plt.Figure) -> bool:
    backend_name = matplotlib.get_backend().lower()
    if "tkagg" not in backend_name:
        return False

    manager = getattr(fig.canvas, "manager", None)
    window = getattr(manager, "window", None)
    if window is None:
        return False

    try:
        import tkinter as tk
    except Exception:
        return False

    if getattr(fig, "_copy_toolbar_frame", None) is not None:
        return True

    children = window.pack_slaves()
    before_widget = children[0] if children else None

    toolbar_frame = tk.Frame(window)
    copy_button = tk.Button(
        toolbar_frame,
        text="Copy for PPT",
        command=lambda: copy_figure_to_clipboard(fig),
        padx=8,
        pady=2,
    )
    copy_button.pack(side="right", padx=8, pady=4)

    pack_kwargs = {"side": "top", "fill": "x"}
    if before_widget is not None:
        pack_kwargs["before"] = before_widget
    toolbar_frame.pack(**pack_kwargs)

    fig._copy_toolbar_frame = toolbar_frame
    fig._copy_toolbar_button = copy_button
    return True


def attach_copy_shortcut(fig: plt.Figure) -> None:
    button_added = add_copy_toolbar_button(fig)

    def handle_key_press(event: object) -> None:
        if getattr(event, "key", None) != "c":
            return
        copy_figure_to_clipboard(fig)
        print("Figure copied to clipboard.")

    fig.canvas.mpl_connect("key_press_event", handle_key_press)
    if not button_added:
        print("Copy button is not available on this backend. Press 'c' in the figure window to copy for PPT.")


def resolve_input_file(dataset_key: str) -> Path:
    normalized_key = dataset_key.strip().lower()
    if normalized_key not in DATASET_FILES:
        valid_keys = ", ".join(sorted(DATASET_FILES))
        raise ValueError(f"Unknown dataset '{dataset_key}'. Use one of: {valid_keys}")

    input_path = DATASET_FILES[normalized_key]
    if not input_path.exists():
        raise FileNotFoundError(
            f"Input file not found: {input_path.name}. Run the corresponding build_studentsperformance script first."
        )

    return input_path


def load_dataset(path: Path) -> tuple[pd.DataFrame, str, str | None, list[str]]:
    df = pd.read_excel(path)
    df.columns = [str(column).strip() for column in df.columns]

    print("Columns:")
    print(df.columns.tolist())

    student_col = df.columns[0]

    score_col = None
    for col in df.columns:
        if col.lower() == "score":
            score_col = col
            break

    features = [col for col in df.columns if col not in [student_col, score_col]]

    print("\nstudent_id column:", student_col)
    print("score column:", score_col)
    print("features:", features)

    selected_columns = [student_col] + ([score_col] if score_col else []) + features
    df = df[selected_columns].copy()
    df = df.rename(columns={student_col: "student_id"})
    if score_col:
        df = df.rename(columns={score_col: "score"})

    df = df.fillna(0)
    return df, student_col, score_col, features


def choose_k(x_scaled: np.ndarray, mode: str, manual_k: int | None, k_range: range) -> int:
    if mode == "a":
        sil_scores = []

        for k in k_range:
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(x_scaled)
            sil_scores.append(silhouette_score(x_scaled, labels))

        best_k = list(k_range)[int(np.argmax(sil_scores))]

        print("\nBest K =", best_k)

        fig = plt.figure(figsize=(6, 4))
        plt.plot(list(k_range), sil_scores, marker="o")
        plt.title("Silhouette Score")
        plt.xlabel("K")
        plt.ylabel("Score")
        plt.grid()
        attach_copy_shortcut(fig)
        plt.show()
        return best_k

    if manual_k is None or manual_k < 2:
        raise ValueError("Manual mode requires a cluster count >= 2.")

    print("\nManual K =", manual_k)
    return manual_k


def plot_cluster_profiles(cluster_means: pd.DataFrame, features: list[str]) -> None:
    labels = features

    overall_values = cluster_means.mean(axis=0).values
    overall_values = np.append(overall_values, overall_values[0])
    overall_angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False)
    overall_angles = np.append(overall_angles, overall_angles[0])

    fig = plt.figure(figsize=(5, 5))
    plt.polar(overall_angles, overall_values)
    plt.fill(overall_angles, overall_values, alpha=0.2)
    plt.title("Overall distribution of CT and HOT dimensions from a regional competition", fontsize=16)
    plt.xticks(overall_angles[:-1], labels, fontsize=18)
    plt.ylim(0, 5)
    attach_copy_shortcut(fig)
    plt.show()

    for cluster_id, row in cluster_means.iterrows():
        values = row.values
        values = np.append(values, values[0])

        angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False)
        angles = np.append(angles, angles[0])

        fig = plt.figure(figsize=(5, 5))
        plt.polar(angles, values)
        plt.fill(angles, values, alpha=0.2)
        plt.title(f"Cluster {cluster_id}", fontweight="bold")
        plt.xticks(angles[:-1], labels, fontsize=18)
        plt.ylim(0, 5)
        attach_copy_shortcut(fig)
        plt.show()


def plot_pca(df: pd.DataFrame, x_scaled: np.ndarray) -> None:
    pca = PCA(n_components=2)
    x_pca = pca.fit_transform(x_scaled)

    fig = plt.figure(figsize=(6, 5))
    for cluster_id in sorted(df["cluster"].unique()):
        subset = x_pca[df["cluster"] == cluster_id]
        plt.scatter(subset[:, 0], subset[:, 1], label=f"Cluster {cluster_id}")

    plt.title("Cluster Visualization (PCA)")
    plt.xlabel("PC1")
    plt.ylabel("PC2")
    plt.legend()
    plt.grid()
    attach_copy_shortcut(fig)
    plt.show()


def plot_score_distribution(df: pd.DataFrame) -> None:
    if "score" not in df.columns:
        return

    fig = plt.figure(figsize=(6, 5))
    sns.boxplot(
        x="cluster",
        y="score",
        data=df,
        color="#3274A1",
        flierprops={
            "marker": "o",
            "markerfacecolor": "white",
            "markeredgecolor": "#5A5A5A",
            "markersize": 6,
            "linestyle": "none",
        },
    )
    plt.title("Score Distribution by Cluster")
    attach_copy_shortcut(fig)
    plt.show()


def sort_clusters_by_score(df: pd.DataFrame) -> pd.DataFrame:
    if "score" not in df.columns:
        return df

    cluster_order = (
        df.groupby("cluster")["score"]
        .mean()
        .sort_values()
        .index
        .tolist()
    )
    cluster_mapping = {old_cluster: new_cluster for new_cluster, old_cluster in enumerate(cluster_order)}

    sorted_df = df.copy()
    sorted_df["cluster"] = sorted_df["cluster"].map(cluster_mapping)
    return sorted_df


def parse_args(argv: list[str]) -> tuple[str, str, int | None, range]:
    if len(argv) < 3:
        valid_keys = ", ".join(sorted(DATASET_FILES))
        raise SystemExit(
            "Usage:\n"
            f"  py clusterresult.py [{valid_keys}] a\n"
            f"  py clusterresult.py [{valid_keys}] m [k]"
        )

    dataset_key = argv[1]
    mode = argv[2].strip().lower() if len(argv) >= 3 else DEFAULT_MODE

    if mode not in {"a", "m"}:
        raise ValueError("Mode must be either 'a' (auto) or 'm' (manual).")

    if mode == "a":
        if len(argv) >= 4:
            raise ValueError("Auto mode does not take a cluster count. Use: py clusterresult.py [model] a")
        return dataset_key, mode, None, DEFAULT_K_RANGE

    manual_k = int(argv[3]) if len(argv) >= 4 else DEFAULT_MANUAL_K
    return dataset_key, mode, manual_k, DEFAULT_K_RANGE


def main(dataset_key: str, mode: str, manual_k: int | None, k_range: range) -> None:
    input_path = resolve_input_file(dataset_key)
    print(f"Using input file: {input_path.name}")

    df, _, _, features = load_dataset(input_path)

    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(df[features])

    best_k = choose_k(x_scaled, mode, manual_k, k_range)

    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(x_scaled)
    df = sort_clusters_by_score(df)

    cluster_means = df.groupby("cluster")[features].mean()

    print("\n=== Cluster Profiles ===")
    print(cluster_means)

    if "score" in df.columns:
        cluster_scores = df.groupby("cluster")["score"].mean()
        print("\n=== Cluster Score Mean ===")
        print(cluster_scores)

    plot_cluster_profiles(cluster_means, features)
    plot_pca(df, x_scaled)
    plot_score_distribution(df)


if __name__ == "__main__":
    dataset_key_arg, mode_arg, manual_k_arg, k_range_arg = parse_args(sys.argv)
    main(dataset_key_arg, mode_arg, manual_k_arg, k_range_arg)
