"""AI module: supervised estimation of ecosystem condition from EO features.

Production path uses scikit-learn's RandomForestRegressor (Breiman 2001; Belgiu &
Dragut 2016). A dependency-free numpy bagged-tree fallback (`NumpyRF`) is provided
so the pipeline can be validated in minimal environments. Both expose fit/predict
and report R2 and RMSE.
"""
from __future__ import annotations
import numpy as np


def feature_stack(bands, indices):
    """Per-pixel feature matrix X from bands + indices."""
    cols = [bands["red"], bands["nir"], bands["green"], bands["swir"],
            indices["ndvi"], indices["ndwi"]]
    return np.stack([c.ravel() for c in cols], axis=1)


def r2_rmse(y, yhat):
    ss_res = float(np.sum((y - yhat) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2)) + 1e-12
    return 1 - ss_res / ss_tot, float(np.sqrt(np.mean((y - yhat) ** 2)))


def make_model(kind="sklearn", **kw):
    if kind == "sklearn":
        try:
            from sklearn.ensemble import RandomForestRegressor
            return RandomForestRegressor(
                n_estimators=kw.get("n_estimators", 300),
                max_depth=kw.get("max_depth", None),
                n_jobs=-1, random_state=kw.get("random_state", 42))
        except ImportError:
            print("[condition_model] scikit-learn missing; using NumpyRF fallback")
    return NumpyRF(**kw)


class _Stump:
    __slots__ = ("f", "t", "lo", "hi", "left", "right", "leaf")

    def __init__(self):
        self.leaf = None


class NumpyRF:
    """Minimal bagged regression-tree forest (CART, MSE split). Pure numpy."""

    def __init__(self, n_estimators=60, max_depth=8, min_leaf=16,
                 random_state=42, **_):
        self.n = n_estimators
        self.max_depth = max_depth
        self.min_leaf = min_leaf
        self.rng = np.random.default_rng(random_state)
        self.trees = []

    def _build(self, X, y, depth):
        node = _Stump()
        if depth >= self.max_depth or len(y) < 2 * self.min_leaf or np.ptp(y) < 1e-6:
            node.leaf = float(np.mean(y)); return node
        m = X.shape[1]
        feats = self.rng.choice(m, max(1, int(np.sqrt(m))), replace=False)
        best = None
        for f in feats:
            xs = X[:, f]
            for t in np.quantile(xs, [0.25, 0.5, 0.75]):
                L = xs <= t
                if L.sum() < self.min_leaf or (~L).sum() < self.min_leaf:
                    continue
                err = (np.var(y[L]) * L.sum() + np.var(y[~L]) * (~L).sum())
                if best is None or err < best[0]:
                    best = (err, f, t, L)
        if best is None:
            node.leaf = float(np.mean(y)); return node
        _, f, t, L = best
        node.f, node.t = f, t
        node.left = self._build(X[L], y[L], depth + 1)
        node.right = self._build(X[~L], y[~L], depth + 1)
        return node

    def fit(self, X, y):
        X, y = np.asarray(X), np.asarray(y)
        self.trees = []
        for _ in range(self.n):
            idx = self.rng.integers(0, len(y), len(y))
            self.trees.append(self._build(X[idx], y[idx], 0))
        return self

    def _pred1(self, node, x):
        while node.leaf is None:
            node = node.left if x[node.f] <= node.t else node.right
        return node.leaf

    def predict(self, X):
        X = np.asarray(X)
        out = np.zeros(len(X))
        for node in self.trees:
            out += np.array([self._pred1(node, x) for x in X])
        return out / len(self.trees)
