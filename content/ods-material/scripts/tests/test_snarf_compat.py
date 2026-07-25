#!/usr/bin/env python3
"""Regression tests for the Python 3 compatibility port of snarf-python.py."""

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "vendor_compat/snarf_python3.py"
SPEC = importlib.util.spec_from_file_location("snarf_python3", MODULE_PATH)
SNARF = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(SNARF)


class SnarfCompatibilityTests(unittest.TestCase):
    def test_inline_code_translation(self):
        self.assertEqual(
            SNARF.code_subs("Use #a[i] = x# now."),
            r"Use \ensuremath{\ensuremath{\ensuremath{\mathit{a}}[\ensuremath{i}] \gets  \ensuremath{x}}} now.",
        )

    def test_math_operator_translation(self):
        translated = SNARF.translate_code("if x <= y:")
        self.assertIn(r"\le", translated)
        self.assertIn(r"\textbf{if}", translated)
        self.assertIn(r"\textbf{then}", translated)

    def test_indentation_translation(self):
        self.assertEqual(
            SNARF.touchup_code_line("        return x"),
            r"\hspace*{1em} \hspace*{1em} return x\\",
        )

    def test_figure_substitution(self):
        self.assertEqual(
            SNARF.fig_subs(r"\includegraphics[width=1in]{figs/tree}"),
            r"\includegraphics[width=1in]{figs-python/tree}",
        )

    def test_python3_replacement_escapes(self):
        self.assertEqual(
            SNARF.translate_code("x = y"),
            r"\ensuremath{\ensuremath{\mathit{x}} \gets  \ensuremath{y}}",
        )


if __name__ == "__main__":
    unittest.main()
