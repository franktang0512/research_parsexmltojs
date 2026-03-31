import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA

# =========================
# 🔥 設定（你只改這裡）
# =========================
# USE_AUTO_K = True
USE_AUTO_K = False
MANUAL_K = 5
K_RANGE = range(2, 7)

FILE_PATH = "studentsperformance.xlsx"

# =========================
# 1️⃣ 讀資料（乾淨版）
# =========================

df = pd.read_excel(FILE_PATH)

# 清理欄位名稱
df.columns = [str(c).strip() for c in df.columns]

print("📌 欄位名稱：")
print(df.columns.tolist())

# =========================
# 2️⃣ 自動抓欄位
# =========================

# 第一欄當 student_id
student_col = df.columns[0]

# 找 score（如果有）
score_col = None
for col in df.columns:
    if "score" in col.lower():
        score_col = col

# 找能力欄位（排除 id / score）
features = [
    col for col in df.columns
    if col not in [student_col, score_col]
]

print("\n👉 student_id 欄位:", student_col)
print("👉 score 欄位:", score_col)
print("👉 features:", features)

# 整理資料
df = df[[student_col] + ([score_col] if score_col else []) + features].copy()

df = df.rename(columns={student_col: "student_id"})
if score_col:
    df = df.rename(columns={score_col: "score"})

df = df.fillna(0)

# =========================
# 3️⃣ 標準化
# =========================

scaler = StandardScaler()
X_scaled = scaler.fit_transform(df[features])

# =========================
# 4️⃣ 選 K（自動 or 手動）
# =========================

if USE_AUTO_K:
    sil_scores = []

    for k in K_RANGE:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil_scores.append(silhouette_score(X_scaled, labels))

    best_k = list(K_RANGE)[np.argmax(sil_scores)]

    print("\n👉 自動選擇最佳 K =", best_k)

    plt.figure(figsize=(6,4))
    plt.plot(list(K_RANGE), sil_scores, marker='o')
    plt.title("Silhouette Score")
    plt.xlabel("K")
    plt.ylabel("Score")
    plt.grid()
    plt.show()

else:
    best_k = MANUAL_K
    print("\n👉 手動設定 K =", best_k)

# =========================
# 5️⃣ K-means
# =========================

kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
df["cluster"] = kmeans.fit_predict(X_scaled)

# =========================
# 6️⃣ 每群平均（核心🔥）
# =========================

cluster_means = df.groupby("cluster")[features].mean()

print("\n=== 📊 Cluster Profiles ===")
print(cluster_means)

# =========================
# 7️⃣ Score（如果有）
# =========================

if "score" in df.columns:
    cluster_scores = df.groupby("cluster")["score"].mean()
    print("\n=== 🧮 Cluster Score ===")
    print(cluster_scores)

# =========================
# 8️⃣ 雷達圖
# =========================

labels = features

for i, row in cluster_means.iterrows():
    values = row.values
    values = np.append(values, values[0])

    angles = np.linspace(0, 2*np.pi, len(labels), endpoint=False)
    angles = np.append(angles, angles[0])

    plt.figure(figsize=(5,5))
    plt.polar(angles, values)
    plt.fill(angles, values, alpha=0.2)
    plt.title(f"Cluster {i}")
    plt.xticks(angles[:-1], labels, fontsize=8)
    plt.ylim(0,5)
    plt.show()

# =========================
# 9️⃣ PCA 分群圖
# =========================

pca = PCA(n_components=2)
X_pca = pca.fit_transform(X_scaled)

plt.figure(figsize=(6,5))

for cluster in sorted(df["cluster"].unique()):
    subset = X_pca[df["cluster"] == cluster]
    plt.scatter(subset[:,0], subset[:,1], label=f"Cluster {cluster}")

plt.title("Cluster Visualization (PCA)")
plt.xlabel("PC1")
plt.ylabel("PC2")
plt.legend()
plt.grid()
plt.show()

# =========================
# 🔟 score 分布（如果有）
# =========================

if "score" in df.columns:
    plt.figure(figsize=(6,5))
    sns.boxplot(x="cluster", y="score", data=df)
    plt.title("Score Distribution by Cluster")
    plt.show()