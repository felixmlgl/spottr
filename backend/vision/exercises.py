"""Shared exercise vocabulary + muscle loading used for the heat map.

Keys here are the contract with the dashboard: session.json uses these exercise ids and muscle ids.
Weights are rough "how much does this exercise train this muscle" (1 = primary mover).
"""

MUSCLES = [
    "chest", "front_delts", "side_delts", "rear_delts", "traps", "lats", "upper_back", "lower_back",
    "biceps", "triceps", "forearms", "abs", "obliques", "glutes", "quads", "hamstrings", "calves", "adductors",
]

EXERCISES = {
    "squat":             {"quads": 1.0, "glutes": 0.8, "adductors": 0.5, "hamstrings": 0.3, "lower_back": 0.3, "abs": 0.2},
    "deadlift":          {"hamstrings": 0.9, "glutes": 0.9, "lower_back": 0.8, "traps": 0.4, "quads": 0.4, "forearms": 0.4, "upper_back": 0.3},
    "romanian_deadlift": {"hamstrings": 1.0, "glutes": 0.8, "lower_back": 0.6, "forearms": 0.3},
    "lunge":             {"quads": 1.0, "glutes": 0.8, "adductors": 0.3, "hamstrings": 0.3},
    "leg_press":         {"quads": 1.0, "glutes": 0.6, "adductors": 0.3},
    "leg_extension":     {"quads": 1.0},
    "leg_curl":          {"hamstrings": 1.0, "calves": 0.2},
    "hip_thrust":        {"glutes": 1.0, "hamstrings": 0.4},
    "calf_raise":        {"calves": 1.0},
    "bench_press":       {"chest": 1.0, "front_delts": 0.5, "triceps": 0.6},
    "incline_press":     {"chest": 0.9, "front_delts": 0.7, "triceps": 0.5},
    "push_up":           {"chest": 1.0, "front_delts": 0.4, "triceps": 0.5, "abs": 0.3},
    "chest_fly":         {"chest": 1.0, "front_delts": 0.3},
    "shoulder_press":    {"front_delts": 1.0, "side_delts": 0.5, "triceps": 0.6, "traps": 0.2},
    "lateral_raise":     {"side_delts": 1.0, "traps": 0.3},
    "rear_delt_fly":     {"rear_delts": 1.0, "upper_back": 0.5},
    "bicep_curl":        {"biceps": 1.0, "forearms": 0.4},
    "tricep_extension":  {"triceps": 1.0},
    "dip":               {"triceps": 1.0, "chest": 0.7, "front_delts": 0.5},
    "lat_pulldown":      {"lats": 1.0, "biceps": 0.5, "rear_delts": 0.3, "upper_back": 0.4},
    "pull_up":           {"lats": 1.0, "biceps": 0.6, "upper_back": 0.5, "forearms": 0.3},
    "seated_row":        {"upper_back": 1.0, "lats": 0.7, "rear_delts": 0.4, "biceps": 0.4},
    "bent_over_row":     {"upper_back": 1.0, "lats": 0.7, "rear_delts": 0.4, "biceps": 0.4, "lower_back": 0.3},
    "shrug":             {"traps": 1.0, "forearms": 0.3},
    "crunch":            {"abs": 1.0, "obliques": 0.3},
    "other":             {},
}

EXERCISE_IDS = list(EXERCISES)


def muscle_load(sets):
    """Sum reps x weight per muscle over a list of set dicts -> {muscle: score}, normalised to max 1."""
    load = {m: 0.0 for m in MUSCLES}
    for s in sets:
        for m, w in EXERCISES.get(s.get("exercise", "other"), {}).items():
            load[m] += w * s["reps"]
    top = max(load.values()) or 1.0
    return {m: round(v / top, 3) for m, v in load.items()}
