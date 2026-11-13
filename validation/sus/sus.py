"""Calcula a nota SUS (System Usability Scale) de cada participante.

Uso:
    python validation/sus/sus.py validation/sus/respostas.csv

O CSV tem uma linha por participante: q1..q10 com as respostas de 1 a 5 e,
para cada tarefa N, tN_ok (1 concluiu, 0 não concluiu) e tN_seg (segundos).
Imprime o resultado em Markdown, pronto para colar em docs/validacao.md.
"""

from __future__ import annotations

import csv
import statistics
import sys
from pathlib import Path

QUESTIONS = [f"q{number}" for number in range(1, 11)]
TARGET_SCORE = 68


def sus_score(answers: list[int]) -> float:
    """Itens ímpares valem resposta - 1; pares, 5 - resposta. Soma x 2,5."""
    if len(answers) != 10:
        raise ValueError("O SUS tem 10 respostas")

    for answer in answers:
        if answer < 1 or answer > 5:
            raise ValueError(f"Resposta fora da escala de 1 a 5: {answer}")

    total = 0
    for index, answer in enumerate(answers):
        total += answer - 1 if index % 2 == 0 else 5 - answer

    return total * 2.5


def task_numbers(header: list[str]) -> list[int]:
    numbers = []
    for column in header:
        if column.startswith("t") and column.endswith("_ok"):
            numbers.append(int(column[1:-3]))
    return sorted(numbers)


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as file:
        return [row for row in csv.DictReader(file) if row.get("participante")]


def format_number(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


def report(rows: list[dict[str, str]]) -> str:
    if not rows:
        return "Nenhuma resposta em respostas.csv."

    scores = []
    lines = ["| Participante | Nota SUS |", "|---|---|"]
    for row in rows:
        score = sus_score([int(row[question]) for question in QUESTIONS])
        scores.append(score)
        lines.append(f"| {row['participante']} | {format_number(score)} |")

    average = statistics.mean(scores)
    result = "APROVADO" if average >= TARGET_SCORE else "REPROVADO"
    lines += [
        "",
        f"- Participantes: {len(scores)}",
        f"- Média: {format_number(average)} (critério: {TARGET_SCORE} ou mais) — {result}",
        f"- Menor e maior nota: {format_number(min(scores))} e {format_number(max(scores))}",
        "",
        "| Tarefa | Concluíram | Tempo médio |",
        "|---|---|---|",
    ]

    for number in task_numbers(list(rows[0].keys())):
        done = [row for row in rows if row.get(f"t{number}_ok", "").strip() == "1"]
        times = [
            float(row[f"t{number}_seg"])
            for row in done
            if row.get(f"t{number}_seg", "").strip()
        ]
        average_time = f"{format_number(statistics.mean(times), 0)} s" if times else "-"
        lines.append(f"| {number} | {len(done)} de {len(rows)} | {average_time} |")

    return "\n".join(lines)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 1

    print(report(read_rows(Path(argv[1]))))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
